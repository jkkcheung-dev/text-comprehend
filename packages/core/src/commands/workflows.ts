import { access, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { runPipeline, runSingleFilePipeline, type AgentExecutor, type PipelineResult } from "../pipeline/index.js";
import { isBinaryDocumentType, isSupportedFileType } from "../scanner/index.js";
import { KnowledgeGraphSchema } from "../schemas/index.js";

export interface RunComprehendWorkflowOptions {
  rootDir: string;
  retryFailed?: boolean;
  agentExecutor: AgentExecutor;
}

export interface AnalyzedDocumentListItem {
  id: string;
  filePath: string;
  title: string;
}

export type SummaryWorkflowResult =
  | { status: "not-found" }
  | {
      status: "analyzed" | "analyzed-on-demand";
      document: AnalyzedDocumentListItem;
      layeredSummary: string;
    };

export type ChatWorkflowResult =
  | { status: "missing-artifacts" }
  | {
      status: "ready";
      question: string;
      answer: string;
      documents: Array<AnalyzedDocumentListItem & {
        layeredSummary: string;
        conceptGlossary: string;
        argumentMap: string;
        comprehensionCheck: string;
      }>;
    };

export interface CreateCommandPromptOptions {
  command: "comprehend" | "comprehend-summary" | "comprehend-chat";
  argumentsText?: string;
}

async function loadKnowledgeGraph(rootDir: string) {
  const raw = await readFile(join(rootDir, ".text-comprehend", "knowledge-graph.json"), "utf-8");
  return KnowledgeGraphSchema.parse(JSON.parse(raw));
}

function normalizeRelativeFilePath(rootDir: string, filePath: string): string {
  return relative(rootDir, resolve(rootDir, filePath)).replace(/\\/g, "/");
}

async function readLayeredSummary(rootDir: string, documentId: string): Promise<string> {
  return readFile(join(rootDir, ".text-comprehend", "simplified", documentId, "layered-summary.md"), "utf-8");
}

async function readDocumentArtifacts(rootDir: string, documentId: string) {
  const baseDir = join(rootDir, ".text-comprehend", "simplified", documentId);
  const [layeredSummary, conceptGlossary, argumentMap, comprehensionCheck] = await Promise.all([
    readFile(join(baseDir, "layered-summary.md"), "utf-8"),
    readFile(join(baseDir, "concept-glossary.md"), "utf-8"),
    readFile(join(baseDir, "argument-map.md"), "utf-8"),
    readFile(join(baseDir, "comprehension-check.md"), "utf-8"),
  ]);

  return {
    layeredSummary,
    conceptGlossary,
    argumentMap,
    comprehensionCheck,
  };
}

function scoreDocumentMatch(question: string, document: { filePath: string; title: string }): number {
  const lowered = question.toLowerCase();
  let score = 0;
  if (lowered.includes(document.filePath.toLowerCase())) score += 10;
  if (lowered.includes(document.title.toLowerCase())) score += 5;
  return score;
}

function scoreArtifactMatch(question: string, artifactText: string): number {
  const normalizedQuestion = question.toLowerCase();
  const tokens = normalizedQuestion.match(/[a-z0-9][a-z0-9._-]*/g) ?? [];
  let score = 0;

  for (const token of tokens) {
    if (token.length < 3) continue;
    if (artifactText.toLowerCase().includes(token)) {
      score += token.length;
    }
  }

  return score;
}

async function answerChatQuestion(question: string, documents: Array<AnalyzedDocumentListItem & {
  layeredSummary: string;
  conceptGlossary: string;
  argumentMap: string;
  comprehensionCheck: string;
}>, agentExecutor: AgentExecutor): Promise<string> {
  const promptSections = documents.map((document) => [
    `Document: ${document.filePath}`,
    `Title: ${document.title}`,
    "Layered summary:",
    document.layeredSummary,
    "Concept glossary:",
    document.conceptGlossary,
    "Argument map:",
    document.argumentMap,
    "Comprehension check:",
    document.comprehensionCheck,
  ].join("\n"));

  const prompt = [
    "You are producing a repository-backed chat answer over analyzed text-comprehend artifacts.",
    "This is a repository-backed chat answer. Use only the analyzed artifacts below.",
    `Question: ${question}`,
    "",
    ...promptSections,
    "",
    "Return a concise plain-text answer. If the artifacts do not answer the question, say so clearly.",
  ].join("\n");

  return (await agentExecutor(prompt)).trim();
}

export async function createCommandPrompt(options: CreateCommandPromptOptions): Promise<string> {
  const args = options.argumentsText?.trim();
  const commandLine = [`npx tsx scripts/command-bridge.ts`, options.command, args]
    .filter(Boolean)
    .join(" ");

  return [
    `Run the repository-backed command bridge: \`${commandLine}\`.`,
    "Do not reimplement the command behavior from the markdown file itself.",
    "Use the command bridge output as the source of truth for this slash command.",
  ].join("\n");
}

export async function runComprehendWorkflow(
  options: RunComprehendWorkflowOptions,
): Promise<PipelineResult> {
  return runPipeline({
    rootDir: options.rootDir,
    retryFailed: options.retryFailed ?? false,
    agentExecutor: options.agentExecutor,
  });
}

export async function listAnalyzedDocuments(rootDir: string): Promise<AnalyzedDocumentListItem[]> {
  const graph = await loadKnowledgeGraph(rootDir);
  return graph.documents.map((document) => ({
    id: document.id,
    filePath: document.filePath,
    title: document.title,
  }));
}

export async function resolveSummaryWorkflow(options: {
  rootDir: string;
  filePath: string;
  agentExecutor: AgentExecutor;
}): Promise<SummaryWorkflowResult> {
  const relativePath = normalizeRelativeFilePath(options.rootDir, options.filePath);

  try {
    const graph = await loadKnowledgeGraph(options.rootDir);
    const existing = graph.documents.find((document) => document.filePath === relativePath);
    if (existing) {
      return {
        status: "analyzed",
        document: {
          id: existing.id,
          filePath: existing.filePath,
          title: existing.title,
        },
        layeredSummary: await readLayeredSummary(options.rootDir, existing.id),
      };
    }
  } catch {
    // No analyzed artifacts yet; fall through to on-demand analysis.
  }

  const absolutePath = resolve(options.rootDir, relativePath);
  try {
    await access(absolutePath);
  } catch {
    return { status: "not-found" };
  }

  if (!isSupportedFileType(relativePath) || isBinaryDocumentType(relativePath)) {
    throw new Error(`Unsupported summary target: ${relativePath}`);
  }

  await runSingleFilePipeline({
    rootDir: options.rootDir,
    relativePath,
    agentExecutor: options.agentExecutor,
  });

  const graph = await loadKnowledgeGraph(options.rootDir);
  const analyzed = graph.documents.find((document) => document.filePath === relativePath);
  if (!analyzed) {
    throw new Error(`Document missing after single-file analysis: ${relativePath}`);
  }

  return {
    status: "analyzed-on-demand",
    document: {
      id: analyzed.id,
      filePath: analyzed.filePath,
      title: analyzed.title,
    },
    layeredSummary: await readLayeredSummary(options.rootDir, analyzed.id),
  };
}

export async function resolveChatWorkflow(options: {
  rootDir: string;
  question: string;
  agentExecutor: AgentExecutor;
}): Promise<ChatWorkflowResult> {
  let graph;
  try {
    graph = await loadKnowledgeGraph(options.rootDir);
  } catch {
    return { status: "missing-artifacts" };
  }

  const ranked = await Promise.all(
    graph.documents.map(async (document) => {
      const artifacts = await readDocumentArtifacts(options.rootDir, document.id);
      const artifactText = [
        artifacts.layeredSummary,
        artifacts.conceptGlossary,
        artifacts.argumentMap,
        artifacts.comprehensionCheck,
      ].join("\n");

      return {
        document,
        artifacts,
        score: scoreDocumentMatch(options.question, document) + scoreArtifactMatch(options.question, artifactText),
      };
    }),
  );

  const sorted = ranked
    .sort((left, right) => right.score - left.score);

  const maxScore = sorted[0]?.score ?? 0;
  const selected = maxScore > 0
    ? sorted.filter((entry) => entry.score === maxScore).slice(0, 5)
    : [];
  const documents = selected.map((entry) => ({
    id: entry.document.id,
    filePath: entry.document.filePath,
    title: entry.document.title,
    layeredSummary: entry.artifacts.layeredSummary,
    conceptGlossary: entry.artifacts.conceptGlossary,
    argumentMap: entry.artifacts.argumentMap,
    comprehensionCheck: entry.artifacts.comprehensionCheck,
  }));

  return {
    status: "ready",
    question: options.question,
    answer: await answerChatQuestion(options.question, documents, options.agentExecutor),
    documents,
  };
}
