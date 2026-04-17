import { readFile, unlink } from "node:fs/promises";
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

async function processDocument(
  file: ScannedFile,
  facetsToRun: FacetType[],
  agentExecutor: AgentExecutor,
  rootDir: string,
): Promise<DocumentResult> {
  const content = await readFile(file.absolutePath, "utf-8");
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
  const { manifest } = await manifestManager.load();

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
