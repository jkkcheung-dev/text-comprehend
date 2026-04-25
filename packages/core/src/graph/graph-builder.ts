import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ManifestManager } from "../manifest/manifest-manager.js";
import { loadAllFacetsForDocument } from "../pipeline/facet-persistence.js";
import {
  SummarizerOutputSchema,
  ConceptExtractorOutputSchema,
  ArgumentMapperOutputSchema,
  QAGeneratorOutputSchema,
} from "../agents/schemas/index.js";
import { KnowledgeGraphSchema, type KnowledgeGraph, type DocumentNode } from "../schemas/index.js";
import type { z } from "zod";
import type { ConceptRelationshipSchema } from "../agents/schemas/index.js";
import { generateEdges } from "./edge-generator.js";
import { findOrphans } from "./dedup.js";

type ConceptRelationship = z.infer<typeof ConceptRelationshipSchema>;

const OUTPUT_DIR = ".text-comprehend";
const KG_FILE = "knowledge-graph.json";

const DEFAULT_SUMMARY = {
  thesis: "Summary unavailable",
  overview: "Analysis pending",
  sections: [],
};

export async function buildKnowledgeGraph(rootDir: string): Promise<KnowledgeGraph> {
  const mm = new ManifestManager(rootDir);
  const { manifest } = await mm.load();

  const documents: DocumentNode[] = [];
  const conceptRelationships = new Map<string, ConceptRelationship[]>();

  for (const [filePath, entry] of Object.entries(manifest.files)) {
    // Skip if no successful facet
    const hasSuccess = Object.values(entry.facets).some((f) => f.status === "success");
    if (!hasSuccess) continue;

    const facets = await loadAllFacetsForDocument(rootDir, entry.documentId);

    // Parse each facet with safeParse
    const summaryResult = SummarizerOutputSchema.safeParse(facets.summary);
    const conceptsResult = ConceptExtractorOutputSchema.safeParse(facets.concepts);
    const argumentsResult = ArgumentMapperOutputSchema.safeParse(facets.arguments);
    const qaResult = QAGeneratorOutputSchema.safeParse(facets.qa);

    // Store concept relationships
    if (conceptsResult.success && conceptsResult.data.relationships.length > 0) {
      conceptRelationships.set(entry.documentId, conceptsResult.data.relationships);
    }

    // Determine file type from extension
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "txt";
    const fileType = (["md", "txt", "pdf", "rst", "html", "docx"].includes(ext) ? ext : "txt") as DocumentNode["fileType"];

    const doc: DocumentNode = {
      id: entry.documentId,
      filePath,
      title: entry.title,
      fileType,
      lastAnalyzed: entry.lastAnalyzed,
      fileHash: entry.fileHash,
      summary: summaryResult.success ? summaryResult.data.summary : DEFAULT_SUMMARY,
      concepts: conceptsResult.success ? conceptsResult.data.concepts : [],
      arguments: argumentsResult.success ? argumentsResult.data.arguments : [],
      questions: qaResult.success ? qaResult.data.questions : [],
    };

    documents.push(doc);
  }

  // Generate edges
  const edges = generateEdges(documents, conceptRelationships);

  // Detect orphans
  const orphans = findOrphans(documents, edges);
  if (orphans.length > 0) {
    console.warn(`[graph-builder] ${orphans.length} orphan node(s): ${orphans.join(", ")}`);
  }

  const kg: KnowledgeGraph = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    documents,
    edges,
  };

  // Validate
  const validated = KnowledgeGraphSchema.parse(kg);

  // Save
  const outDir = join(rootDir, OUTPUT_DIR);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, KG_FILE), JSON.stringify(validated, null, 2), "utf-8");

  return validated;
}
