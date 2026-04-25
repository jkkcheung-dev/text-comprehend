import { readFile, stat, unlink } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { scanDirectory, type ScannedFile } from "../scanner/index.js";
import { ManifestManager } from "../manifest/index.js";
import type { Manifest, ManifestFileEntry, FacetStatus } from "../schemas/index.js";
import {
  buildSummarizerPrompt,
  buildConceptExtractorPrompt,
  buildArgumentMapperPrompt,
  buildQAGeneratorPrompt,
  parseAgentResponse,
  SummarizerOutputSchema,
  ConceptExtractorOutputSchema,
  ArgumentMapperOutputSchema,
  QAGeneratorOutputSchema,
  type AgentInput,
} from "../agents/index.js";
import { saveFacetOutput } from "./facet-persistence.js";
import { getFacetOutputPath } from "./facet-persistence.js";
import { buildKnowledgeGraph } from "../graph/index.js";
import { renderMarkdownOutput } from "../renderer/index.js";
import type {
  FacetType,
  AgentExecutor,
  PipelineOptions,
  FacetResult,
  DocumentResult,
  PipelineResult,
} from "./types.js";
import type { SourceRef } from "../schemas/index.js";

const ALL_FACETS: FacetType[] = ["summary", "concepts", "arguments", "qa"];
const DEFAULT_BATCH_SIZE = 5;
const LARGE_FILE_THRESHOLD = 100 * 1024; // 100KB
const CHUNK_TARGET_SIZE = 50 * 1024; // ~50KB per chunk

export interface SingleFilePipelineOptions {
  rootDir: string;
  relativePath: string;
  agentExecutor: AgentExecutor;
}

function joinUniqueSentences(parts: string[]): string {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const normalized = part.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique.join(" ");
}

function joinUniqueParagraphs(parts: string[]): string {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const normalized = part.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique.join("\n\n");
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function dedupeRelationships<T extends { source: string; target: string; type: string; label?: string; weight?: number }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}|${item.target}|${item.type}|${item.label ?? ""}|${item.weight ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeFilenameTitle(filePath: string): string {
  const name = basename(filePath, extname(filePath));
  return name.replace(/[-_]/g, " ");
}

function isUsableTitle(title: string): boolean {
  return /[\p{L}\p{N}]/u.test(title);
}

function resolveCanonicalTitle(filePath: string, content: string): string {
  const lines = content.split("\n");

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) continue;

    if (/^#{1,6}(?:\s+|$)/.test(normalized)) {
      const headingTitle = normalized.replace(/^#{1,6}(?:\s+|$)/, "").trim();
      if (isUsableTitle(headingTitle)) return headingTitle;
    }
  }

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) continue;

    if (!/^#{1,6}(?:\s+|$)/.test(normalized) && isUsableTitle(normalized)) {
      return normalized;
    }
  }

  return sanitizeFilenameTitle(filePath);
}

interface ContentChunk {
  content: string;
  startLine: number;
}

const FACET_CONFIG: Record<FacetType, {
  buildPrompt: (input: AgentInput) => string;
  schema: Parameters<typeof parseAgentResponse>[1];
}> = {
  summary: { buildPrompt: buildSummarizerPrompt, schema: SummarizerOutputSchema },
  concepts: { buildPrompt: buildConceptExtractorPrompt, schema: ConceptExtractorOutputSchema },
  arguments: { buildPrompt: buildArgumentMapperPrompt, schema: ArgumentMapperOutputSchema },
  qa: { buildPrompt: buildQAGeneratorPrompt, schema: QAGeneratorOutputSchema },
};

function offsetSourceRef(sourceRef: SourceRef, lineOffset: number): SourceRef {
  return {
    ...sourceRef,
    startLine: sourceRef.startLine + lineOffset,
    endLine: sourceRef.endLine + lineOffset,
  };
}

function normalizeChunkScopedIds<T extends { id: string }>(items: T[], chunkIndex: number): T[] {
  if (chunkIndex === 0) return items;
  return items.map((item) => ({
    ...item,
    id: `${item.id}-chunk-${chunkIndex + 1}`,
  }));
}

function applyChunkOffset(facetType: FacetType, data: any, chunkIndex: number, lineOffset: number): any {
  if (lineOffset === 0) {
    if (facetType === "summary") {
      return {
        ...data,
        summary: {
          ...data.summary,
          sections: normalizeChunkScopedIds(data.summary?.sections ?? [], chunkIndex),
        },
      };
    }
    if (facetType === "concepts") {
      return {
        ...data,
        concepts: normalizeChunkScopedIds(data.concepts ?? [], chunkIndex),
      };
    }
    if (facetType === "arguments") {
      return {
        ...data,
        arguments: normalizeChunkScopedIds(data.arguments ?? [], chunkIndex),
      };
    }
    if (facetType === "qa") {
      return {
        ...data,
        questions: normalizeChunkScopedIds(data.questions ?? [], chunkIndex),
      };
    }
    return data;
  }

  switch (facetType) {
    case "summary":
      return {
        ...data,
        summary: {
          ...data.summary,
          sections: normalizeChunkScopedIds(data.summary?.sections ?? [], chunkIndex).map((section: any) => ({
            ...section,
            sourceRange: offsetSourceRef(section.sourceRange, lineOffset),
          })),
        },
      };
    case "concepts":
      return {
        ...data,
        concepts: normalizeChunkScopedIds(data.concepts ?? [], chunkIndex).map((concept: any) => ({
          ...concept,
          sourceRefs: (concept.sourceRefs ?? []).map((sourceRef: SourceRef) => offsetSourceRef(sourceRef, lineOffset)),
        })),
        relationships: data.relationships ?? [],
      };
    case "arguments":
      return {
        ...data,
        arguments: normalizeChunkScopedIds(data.arguments ?? [], chunkIndex).map((argument: any) => ({
          ...argument,
          evidence: (argument.evidence ?? []).map((evidence: any) => ({
            ...evidence,
            sourceRef: offsetSourceRef(evidence.sourceRef, lineOffset),
          })),
          sourceRefs: (argument.sourceRefs ?? []).map((sourceRef: SourceRef) => offsetSourceRef(sourceRef, lineOffset)),
        })),
      };
    case "qa":
      return {
        ...data,
        questions: normalizeChunkScopedIds(data.questions ?? [], chunkIndex).map((question: any) => ({
          ...question,
          sourceRefs: (question.sourceRefs ?? []).map((sourceRef: SourceRef) => offsetSourceRef(sourceRef, lineOffset)),
        })),
      };
    default:
      return data;
  }
}

async function processOneFacet(
  facetType: FacetType,
  agentInput: AgentInput,
  agentExecutor: AgentExecutor,
  rootDir: string,
  chunkIndex = 0,
): Promise<FacetResult> {
  const config = FACET_CONFIG[facetType];
  try {
    const prompt = config.buildPrompt(agentInput);
    const rawResponse = await agentExecutor(prompt);
    const parsed = parseAgentResponse(rawResponse, config.schema);
    if (!parsed.success) {
      return { facetType, documentId: agentInput.documentId, success: false, error: parsed.error };
    }
    const normalizedData = applyChunkOffset(facetType, parsed.data, chunkIndex, agentInput.lineOffset ?? 0);
    await saveFacetOutput(rootDir, facetType, agentInput.documentId, normalizedData);
    return { facetType, documentId: agentInput.documentId, success: true, data: normalizedData };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { facetType, documentId: agentInput.documentId, success: false, error: message };
  }
}

function splitIntoChunks(content: string): ContentChunk[] {
  const lines = content.split("\n");
  const chunks: ContentChunk[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;
  let chunkStartLine = 1;

  function pushCurrentChunk(): void {
    if (currentChunk.length === 0) return;
    chunks.push({
      content: currentChunk.join("\n"),
      startLine: chunkStartLine,
    });
    chunkStartLine += currentChunk.length;
    currentChunk = [];
    currentSize = 0;
  }

  for (const line of lines) {
    const lineSize = Buffer.byteLength(line, "utf-8") + 1; // +1 for newline
    // Split at heading boundaries or when chunk exceeds target size
    const isHeading = /^#{1,3}\s/.test(line);
    if (isHeading && currentSize > CHUNK_TARGET_SIZE / 2 && currentChunk.length > 0) {
      pushCurrentChunk();
    } else if (currentSize + lineSize > CHUNK_TARGET_SIZE && currentChunk.length > 0) {
      pushCurrentChunk();
    }
    currentChunk.push(line);
    currentSize += lineSize;
  }
  pushCurrentChunk();
  return chunks;
}

function mergeChunkResults(chunkResults: FacetResult[][]): Record<FacetType, FacetResult> {
  const merged: Record<FacetType, FacetResult> = {} as Record<FacetType, FacetResult>;

  for (const ft of ALL_FACETS) {
    const facetResults = chunkResults.map((cr) => cr.find((r) => r.facetType === ft)).filter(Boolean) as FacetResult[];
    if (facetResults.length === 0) {
      merged[ft] = { facetType: ft, documentId: "", success: true, data: undefined };
      continue;
    }

    const anyFailed = facetResults.find((r) => !r.success);
    if (anyFailed) {
      merged[ft] = anyFailed;
      continue;
    }

    // Merge successful results
    const documentId = facetResults[0].documentId;
    const allData = facetResults.map((r) => r.data).filter(Boolean) as any[];

    if (allData.length === 0) {
      merged[ft] = { facetType: ft, documentId, success: true, data: undefined };
      continue;
    }

    let mergedData: any;
    switch (ft) {
      case "summary": {
        const summaries = allData.map((d: any) => d.summary).filter(Boolean);
        const allSections = dedupeById(summaries.flatMap((summary: any) => summary.sections ?? []));
        mergedData = {
          documentId,
          summary: {
            thesis: joinUniqueSentences(summaries.map((summary: any) => summary.thesis ?? "")),
            overview: joinUniqueParagraphs(summaries.map((summary: any) => summary.overview ?? "")),
            sections: allSections,
          },
        };
        break;
      }
      case "concepts": {
        const allConcepts = dedupeById(allData.flatMap((d: any) => d.concepts ?? []));
        const allRelationships = dedupeRelationships(allData.flatMap((d: any) => d.relationships ?? []));
        mergedData = { documentId, concepts: allConcepts, relationships: allRelationships };
        break;
      }
      case "arguments": {
        const allArgs = dedupeById(allData.flatMap((d: any) => d.arguments ?? []));
        mergedData = { documentId, arguments: allArgs };
        break;
      }
      case "qa": {
        const allQuestions = dedupeById(allData.flatMap((d: any) => d.questions ?? []));
        mergedData = { documentId, questions: allQuestions };
        break;
      }
    }
    merged[ft] = { facetType: ft, documentId, success: true, data: mergedData };
  }

  return merged;
}

async function processDocument(
  file: ScannedFile,
  facetsToRun: FacetType[],
  agentExecutor: AgentExecutor,
  rootDir: string,
): Promise<DocumentResult> {
  const content = await readFile(file.absolutePath, "utf-8");
  const contentSize = Buffer.byteLength(content, "utf-8");
  const title = resolveCanonicalTitle(file.relativePath, content);

  // Large file chunking: split files >100KB into chunks
  if (contentSize > LARGE_FILE_THRESHOLD) {
    const chunks = splitIntoChunks(content);
    const chunkResults: FacetResult[][] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunkInput: AgentInput = {
          documentId: file.documentId,
          filePath: file.relativePath,
          title: `${title} (chunk ${i + 1}/${chunks.length})`,
          content: chunks[i].content,
          lineOffset: chunks[i].startLine - 1,
        };
        const settled = await Promise.allSettled(
        facetsToRun.map((ft) => processOneFacet(ft, chunkInput, agentExecutor, rootDir, i)),
      );
      const results: FacetResult[] = settled.map((r, idx) =>
        r.status === "fulfilled"
          ? r.value
          : { facetType: facetsToRun[idx], documentId: file.documentId, success: false as const, error: r.reason instanceof Error ? r.reason.message : String(r.reason) },
      );
      chunkResults.push(results);
    }

    const mergedFacets = mergeChunkResults(chunkResults);
    // Set documentId on all merged results
    for (const ft of ALL_FACETS) {
      mergedFacets[ft].documentId = file.documentId;
    }

    // Re-persist merged data
    for (const ft of facetsToRun) {
      const facet = mergedFacets[ft];
      if (facet.success && facet.data) {
        await saveFacetOutput(rootDir, ft, file.documentId, facet.data);
      }
    }

    // Fill skipped facets
    for (const ft of ALL_FACETS) {
      if (!facetsToRun.includes(ft)) {
        mergedFacets[ft] = { facetType: ft, documentId: file.documentId, success: true, data: undefined };
      }
    }

    return { documentId: file.documentId, filePath: file.relativePath, title, facets: mergedFacets };
  }

  const agentInput: AgentInput = {
    documentId: file.documentId,
    filePath: file.relativePath,
    title,
    content,
  };

  const settled = await Promise.allSettled(
    facetsToRun.map((ft) => processOneFacet(ft, agentInput, agentExecutor, rootDir)),
  );

  const facets: Record<FacetType, FacetResult> = {} as Record<FacetType, FacetResult>;

  // Initialize all facets as skipped (for facets not being run)
  for (const ft of ALL_FACETS) {
    facets[ft] = { facetType: ft, documentId: file.documentId, success: true, data: undefined };
  }

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      facets[result.value.facetType] = result.value;
    } else {
      // This shouldn't happen since processOneFacet catches errors, but just in case
      const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      facets[facetsToRun[i]] = {
        facetType: facetsToRun[i],
        documentId: file.documentId,
        success: false,
        error: errorMsg,
      };
    }
  }

  return { documentId: file.documentId, filePath: file.relativePath, title, facets };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function countFacetOutcomes(results: DocumentResult[]): { facetsSucceeded: number; facetsFailed: number } {
  let facetsSucceeded = 0;
  let facetsFailed = 0;

  for (const docResult of results) {
    for (const facet of Object.values(docResult.facets)) {
      if (facet.data === undefined && facet.success) continue;
      if (facet.success) {
        facetsSucceeded++;
      } else {
        facetsFailed++;
      }
    }
  }

  return { facetsSucceeded, facetsFailed };
}

function updateManifestEntries(
  manifest: Manifest,
  processedEntries: Array<{
    result: DocumentResult;
    fileHash: string;
    processedFacets: FacetType[];
  }>,
): { facetsSucceeded: number; facetsFailed: number } {
  let facetsSucceeded = 0;
  let facetsFailed = 0;

  for (const { result, fileHash, processedFacets } of processedEntries) {
    const existingEntry = manifest.files[result.filePath];

    const facetStatuses: Record<string, FacetStatus> = existingEntry
      ? { ...existingEntry.facets }
      : {
          summary: { status: "pending" as const },
          concepts: { status: "pending" as const },
          arguments: { status: "pending" as const },
          qa: { status: "pending" as const },
        };

    for (const ft of processedFacets) {
      const facetResult = result.facets[ft];
      if (facetResult.success) {
        facetStatuses[ft] = { status: "success" };
        facetsSucceeded++;
      } else {
        facetStatuses[ft] = { status: "failed", error: facetResult.error ?? "Unknown error" };
        facetsFailed++;
      }
    }

    manifest.files[result.filePath] = {
      documentId: result.documentId,
      title: result.title,
      fileHash,
      lastAnalyzed: new Date().toISOString(),
      facets: facetStatuses as ManifestFileEntry["facets"],
    };
  }

  return { facetsSucceeded, facetsFailed };
}

async function finalizeArtifacts(rootDir: string, errors: string[]): Promise<void> {
  try {
    await buildKnowledgeGraph(rootDir);
  } catch (error) {
    errors.push(`Failed to build knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    await renderMarkdownOutput(rootDir);
  } catch (error) {
    errors.push(`Failed to render markdown output: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function runSingleFilePipeline(options: SingleFilePipelineOptions): Promise<PipelineResult> {
  const { rootDir, relativePath, agentExecutor } = options;
  const scanResult = await scanDirectory(rootDir);
  const targetFile = scanResult.files.find((file) => file.relativePath === relativePath);

  if (!targetFile) {
    throw new Error(`Supported text file not found: ${relativePath}`);
  }

  const manifestManager = new ManifestManager(rootDir);
  const { manifest } = await manifestManager.load();
  const result = await processDocument(targetFile, [...ALL_FACETS], agentExecutor, rootDir);
  const errors: string[] = [];
  const counts = updateManifestEntries(manifest, [
    {
      result,
      fileHash: targetFile.fileHash,
      processedFacets: [...ALL_FACETS],
    },
  ]);

  manifest.lastRun = new Date().toISOString();
  await manifestManager.save(manifest);
  await finalizeArtifacts(rootDir, errors);

  return {
    documentsProcessed: 1,
    documentsSkipped: scanResult.files.length - 1,
    facetsSucceeded: counts.facetsSucceeded,
    facetsFailed: counts.facetsFailed,
    results: [result],
    errors,
  };
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { rootDir, batchSize = DEFAULT_BATCH_SIZE, retryFailed = false, agentExecutor } = options;

  // 1. Scan
  const scanResult = await scanDirectory(rootDir);

  // 2. Load manifest
  const manifestManager = new ManifestManager(rootDir);
  const { manifest, wasCorrupt } = await manifestManager.load();

  if (wasCorrupt) {
    console.warn("[pipeline] Manifest was corrupt — triggering full re-analysis of all files.");
    // Clear all file entries so every file appears new
    for (const key of Object.keys(manifest.files)) {
      delete manifest.files[key];
    }
  }

  // 3. Determine files to process
  const changedFiles = manifestManager.getChangedFiles(manifest, scanResult.files);
  const changedPaths = new Set(changedFiles.map((f) => f.relativePath));

  // Build a map of what facets to run per file
  const fileFacetMap = new Map<string, { file: ScannedFile; facets: FacetType[] }>();

  for (const file of changedFiles) {
    fileFacetMap.set(file.relativePath, { file, facets: [...ALL_FACETS] });
  }

  if (retryFailed) {
    const failedEntries = manifestManager.getFailedFacets(manifest);
    // Build a lookup from relativePath to ScannedFile
    const scannedByPath = new Map(scanResult.files.map((f) => [f.relativePath, f]));

    for (const { filePath, facets } of failedEntries) {
      if (changedPaths.has(filePath)) continue; // already processing all facets
      const scannedFile = scannedByPath.get(filePath);
      if (!scannedFile) continue; // file no longer exists
      fileFacetMap.set(filePath, {
        file: scannedFile,
        facets: facets as FacetType[],
      });
    }
  }

  const toProcess = Array.from(fileFacetMap.values());
  const documentsSkipped = scanResult.files.length - toProcess.length;

  // 4. Batch and process
  const batches = chunk(toProcess, batchSize);
  const allResults: DocumentResult[] = [];
  const errors: string[] = [];

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(({ file, facets }) => processDocument(file, facets, agentExecutor, rootDir)),
    );
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        allResults.push(result.value);
      } else {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    }
  }

  // 5. Update manifest
  const { facetsSucceeded, facetsFailed } = updateManifestEntries(
    manifest,
    allResults.map((docResult) => ({
      result: docResult,
      fileHash: fileFacetMap.get(docResult.filePath)!.file.fileHash,
      processedFacets: fileFacetMap.get(docResult.filePath)!.facets,
    })),
  );

  // 5b. Prune deleted files
  const removedFiles = manifestManager.getRemovedFiles(manifest, scanResult.files);
  for (const removedPath of removedFiles) {
    const entry = manifest.files[removedPath];
    if (entry) {
      // Delete facet output files
      for (const ft of ALL_FACETS) {
        try {
          await unlink(
            getFacetOutputPath(rootDir, ft, entry.documentId),
          );
        } catch {
          // File may not exist, ignore
        }
      }
      delete manifest.files[removedPath];
    }
  }

  manifest.lastRun = new Date().toISOString();

  // 6. Save manifest
  await manifestManager.save(manifest);

  await finalizeArtifacts(rootDir, errors);

  return {
    documentsProcessed: allResults.length,
    documentsSkipped,
    facetsSucceeded,
    facetsFailed,
    results: allResults,
    errors,
  };
}
