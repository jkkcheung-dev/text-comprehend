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
import type {
  FacetType,
  AgentExecutor,
  PipelineOptions,
  FacetResult,
  DocumentResult,
  PipelineResult,
} from "./types.js";

const ALL_FACETS: FacetType[] = ["summary", "concepts", "arguments", "qa"];
const DEFAULT_BATCH_SIZE = 5;
const LARGE_FILE_THRESHOLD = 100 * 1024; // 100KB
const CHUNK_TARGET_SIZE = 50 * 1024; // ~50KB per chunk

function extractTitle(filePath: string): string {
  const name = basename(filePath, extname(filePath));
  return name.replace(/[-_]/g, " ");
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

async function processOneFacet(
  facetType: FacetType,
  agentInput: AgentInput,
  agentExecutor: AgentExecutor,
  rootDir: string,
): Promise<FacetResult> {
  const config = FACET_CONFIG[facetType];
  try {
    const prompt = config.buildPrompt(agentInput);
    const rawResponse = await agentExecutor(prompt);
    const parsed = parseAgentResponse(rawResponse, config.schema);
    if (!parsed.success) {
      return { facetType, documentId: agentInput.documentId, success: false, error: parsed.error };
    }
    await saveFacetOutput(rootDir, facetType, agentInput.documentId, parsed.data);
    return { facetType, documentId: agentInput.documentId, success: true, data: parsed.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { facetType, documentId: agentInput.documentId, success: false, error: message };
  }
}

function splitIntoChunks(content: string): string[] {
  const lines = content.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const line of lines) {
    const lineSize = Buffer.byteLength(line, "utf-8") + 1; // +1 for newline
    // Split at heading boundaries or when chunk exceeds target size
    const isHeading = /^#{1,3}\s/.test(line);
    if (isHeading && currentSize > CHUNK_TARGET_SIZE / 2 && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentSize = 0;
    } else if (currentSize + lineSize > CHUNK_TARGET_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(line);
    currentSize += lineSize;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }
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
        // Take first chunk's thesis/overview, merge sections from all chunks
        mergedData = { ...allData[0] };
        if (allData.length > 1) {
          const allSections = allData.flatMap((d: any) => d.summary?.sections ?? []);
          mergedData.summary = { ...mergedData.summary, sections: allSections };
        }
        break;
      }
      case "concepts": {
        const allConcepts = allData.flatMap((d: any) => d.concepts ?? []);
        const allRelationships = allData.flatMap((d: any) => d.relationships ?? []);
        mergedData = { documentId, concepts: allConcepts, relationships: allRelationships };
        break;
      }
      case "arguments": {
        const allArgs = allData.flatMap((d: any) => d.arguments ?? []);
        mergedData = { documentId, arguments: allArgs };
        break;
      }
      case "qa": {
        const allQuestions = allData.flatMap((d: any) => d.questions ?? []);
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

  // Large file chunking: split files >100KB into chunks
  if (contentSize > LARGE_FILE_THRESHOLD) {
    const chunks = splitIntoChunks(content);
    const chunkResults: FacetResult[][] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkInput: AgentInput = {
        documentId: file.documentId,
        filePath: file.relativePath,
        title: `${extractTitle(file.relativePath)} (chunk ${i + 1}/${chunks.length})`,
        content: chunks[i],
      };
      const settled = await Promise.allSettled(
        facetsToRun.map((ft) => processOneFacet(ft, chunkInput, agentExecutor, rootDir)),
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

    return { documentId: file.documentId, filePath: file.relativePath, facets: mergedFacets };
  }

  const agentInput: AgentInput = {
    documentId: file.documentId,
    filePath: file.relativePath,
    title: extractTitle(file.relativePath),
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

  return { documentId: file.documentId, filePath: file.relativePath, facets };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
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
  let facetsSucceeded = 0;
  let facetsFailed = 0;

  for (const docResult of allResults) {
    const existingEntry = manifest.files[docResult.filePath];
    const file = fileFacetMap.get(docResult.filePath)!;

    const facetStatuses: Record<string, FacetStatus> = existingEntry
      ? { ...existingEntry.facets }
      : {
          summary: { status: "pending" as const },
          concepts: { status: "pending" as const },
          arguments: { status: "pending" as const },
          qa: { status: "pending" as const },
        };

    const processedFacets = file.facets;
    for (const ft of processedFacets) {
      const facetResult = docResult.facets[ft];
      if (facetResult.success) {
        facetStatuses[ft] = { status: "success" };
        facetsSucceeded++;
      } else {
        facetStatuses[ft] = { status: "failed", error: facetResult.error ?? "Unknown error" };
        facetsFailed++;
      }
    }

    manifest.files[docResult.filePath] = {
      documentId: docResult.documentId,
      fileHash: file.file.fileHash,
      lastAnalyzed: new Date().toISOString(),
      facets: facetStatuses as ManifestFileEntry["facets"],
    };
  }

  // 5b. Prune deleted files
  const removedFiles = manifestManager.getRemovedFiles(manifest, scanResult.files);
  for (const removedPath of removedFiles) {
    const entry = manifest.files[removedPath];
    if (entry) {
      // Delete facet output files
      for (const ft of ALL_FACETS) {
        try {
          await unlink(
            join(rootDir, ".text-comprehend", "facets", ft, `${entry.documentId}.json`),
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

  return {
    documentsProcessed: allResults.length,
    documentsSkipped,
    facetsSucceeded,
    facetsFailed,
    results: allResults,
    errors,
  };
}
