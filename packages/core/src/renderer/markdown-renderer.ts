import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  KnowledgeGraphSchema,
  type KnowledgeGraph,
  type DocumentNode,
  type SourceRef,
  type ConceptNode,
  type ArgumentNode,
  type QuestionNode,
} from "../schemas/index.js";

const OUTPUT_DIR = ".text-comprehend";
const SIMPLIFIED_DIR = "simplified";

function sourceLines(ref: SourceRef): string {
  return `lines ${ref.startLine}-${ref.endLine}`;
}

function renderLayeredSummary(doc: DocumentNode): string {
  const lines: string[] = [];
  lines.push(`# ${doc.title}`);
  lines.push("");
  lines.push(`> Source: \`${doc.filePath}\``);
  lines.push("");
  lines.push("## Thesis");
  lines.push(doc.summary.thesis);
  lines.push("");
  lines.push("## Overview");
  lines.push(doc.summary.overview);
  lines.push("");

  if (doc.summary.sections.length > 0) {
    lines.push("## Sections");
    lines.push("");

    for (const section of doc.summary.sections) {
      lines.push(`### ${section.heading}`);
      lines.push(section.summary);
      lines.push("");

      if (section.keyPoints.length > 0) {
        lines.push("**Key Points:**");
        for (const kp of section.keyPoints) {
          lines.push(`- ${kp}`);
        }
        lines.push("");
      }

      lines.push(`*Source: ${sourceLines(section.sourceRange)}*`);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderConceptGlossary(doc: DocumentNode): string {
  const lines: string[] = [];
  lines.push(`# Concept Glossary: ${doc.title}`);
  lines.push("");
  lines.push(`> Source: \`${doc.filePath}\``);
  lines.push("");

  const groups: Record<string, ConceptNode[]> = {
    core: [],
    supporting: [],
    peripheral: [],
  };

  for (const concept of doc.concepts) {
    groups[concept.importance].push(concept);
  }

  const sectionTitles: Record<string, string> = {
    core: "Core Concepts",
    supporting: "Supporting Concepts",
    peripheral: "Peripheral Concepts",
  };

  for (const level of ["core", "supporting", "peripheral"] as const) {
    const concepts = groups[level];
    if (concepts.length === 0) continue;

    lines.push(`## ${sectionTitles[level]}`);
    lines.push("");

    for (const concept of concepts) {
      lines.push(`### ${concept.name}`);
      lines.push(concept.definition);
      lines.push("");
      lines.push(`- **Importance:** ${concept.importance}`);
      if (concept.sourceRefs.length > 0) {
        lines.push(`- **Source:** ${sourceLines(concept.sourceRefs[0])}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderArgumentMap(doc: DocumentNode): string {
  const lines: string[] = [];
  lines.push(`# Argument Map: ${doc.title}`);
  lines.push("");
  lines.push(`> Source: \`${doc.filePath}\``);
  lines.push("");

  const groups: Record<string, ArgumentNode[]> = {
    main: [],
    supporting: [],
    counter: [],
  };

  for (const arg of doc.arguments) {
    groups[arg.type].push(arg);
  }

  const sectionTitles: Record<string, string> = {
    main: "Main Claims",
    supporting: "Supporting Claims",
    counter: "Counter Claims",
  };

  for (const type of ["main", "supporting", "counter"] as const) {
    const args = groups[type];
    if (args.length === 0) continue;

    lines.push(`## ${sectionTitles[type]}`);
    lines.push("");

    for (const arg of args) {
      lines.push(`### Claim: ${arg.claim}`);
      lines.push("");

      if (arg.evidence.length > 0) {
        lines.push("**Evidence:**");
        for (let i = 0; i < arg.evidence.length; i++) {
          const ev = arg.evidence[i];
          lines.push(`${i + 1}. [${ev.type}, ${ev.strength}] ${ev.content}`);
          lines.push(`   *Source: ${sourceLines(ev.sourceRef)}*`);
        }
        lines.push("");
      }

      if (arg.assumptions.length > 0) {
        lines.push("**Assumptions:**");
        for (const a of arg.assumptions) {
          lines.push(`- ${a}`);
        }
        lines.push("");
      }

      if (arg.gaps.length > 0) {
        lines.push("**Gaps:**");
        for (const g of arg.gaps) {
          lines.push(`- ${g}`);
        }
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderComprehensionCheck(doc: DocumentNode): string {
  const lines: string[] = [];
  lines.push(`# Comprehension Check: ${doc.title}`);
  lines.push("");
  lines.push(`> Source: \`${doc.filePath}\``);
  lines.push("");

  const groups: Record<string, QuestionNode[]> = {
    basic: [],
    intermediate: [],
    advanced: [],
  };

  for (const q of doc.questions) {
    groups[q.difficulty].push(q);
  }

  const sectionTitles: Record<string, string> = {
    basic: "Basic Questions",
    intermediate: "Intermediate Questions",
    advanced: "Advanced Questions",
  };

  for (const level of ["basic", "intermediate", "advanced"] as const) {
    const questions = groups[level];
    if (questions.length === 0) continue;

    lines.push(`## ${sectionTitles[level]}`);
    lines.push("");

    for (const q of questions) {
      lines.push(`### Q: ${q.question} *(${q.facet})*`);
      lines.push("<details>");
      lines.push("<summary>Show Answer</summary>");
      lines.push("");
      lines.push(q.answer);
      lines.push("");
      if (q.sourceRefs.length > 0) {
        lines.push(`*Source: ${sourceLines(q.sourceRefs[0])}*`);
        lines.push("");
      }
      lines.push("</details>");
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function renderDocument(rootDir: string, doc: DocumentNode): Promise<void> {
  const docDir = join(rootDir, OUTPUT_DIR, SIMPLIFIED_DIR, doc.id);
  await mkdir(docDir, { recursive: true });

  await Promise.all([
    writeFile(join(docDir, "layered-summary.md"), renderLayeredSummary(doc)),
    writeFile(join(docDir, "concept-glossary.md"), renderConceptGlossary(doc)),
    writeFile(join(docDir, "argument-map.md"), renderArgumentMap(doc)),
    writeFile(join(docDir, "comprehension-check.md"), renderComprehensionCheck(doc)),
  ]);
}

async function loadKnowledgeGraph(rootDir: string): Promise<KnowledgeGraph> {
  const graphPath = join(rootDir, OUTPUT_DIR, "knowledge-graph.json");
  const raw = await readFile(graphPath, "utf-8");
  return KnowledgeGraphSchema.parse(JSON.parse(raw));
}

export async function renderMarkdownOutput(rootDir: string): Promise<void> {
  const graph = await loadKnowledgeGraph(rootDir);
  await Promise.all(graph.documents.map((doc) => renderDocument(rootDir, doc)));
}

export async function renderSingleDocument(rootDir: string, documentId: string): Promise<void> {
  const graph = await loadKnowledgeGraph(rootDir);
  const doc = graph.documents.find((d) => d.id === documentId);
  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }
  await renderDocument(rootDir, doc);
}
