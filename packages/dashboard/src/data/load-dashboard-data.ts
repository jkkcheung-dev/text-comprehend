import { KnowledgeGraphSchema } from "../../../core/src/schemas/index.js";
import type { DashboardData, DashboardDocument, DashboardReader, DashboardSimplifiedDocument } from "./types";

const GRAPH_PATH = ".text-comprehend/knowledge-graph.json";

function isMissingArtifact(error: unknown): boolean {
  return error instanceof Error && error.message.includes("ENOENT");
}

function malformed(path: string, error: unknown): DashboardData {
  return {
    state: "malformed",
    path,
    error: error instanceof Error ? error.message : String(error),
  };
}

async function loadSimplifiedDocument(read: DashboardReader, documentId: string): Promise<DashboardSimplifiedDocument> {
  const basePath = `.text-comprehend/simplified/${documentId}`;

  const [layeredSummary, conceptGlossary, argumentMap, comprehensionCheck] = await Promise.all([
    read(`${basePath}/layered-summary.md`),
    read(`${basePath}/concept-glossary.md`),
    read(`${basePath}/argument-map.md`),
    read(`${basePath}/comprehension-check.md`),
  ]);

  return {
    layeredSummary,
    conceptGlossary,
    argumentMap,
    comprehensionCheck,
  };
}

export async function loadDashboardData(read: DashboardReader): Promise<DashboardData> {
  let graphRaw: string;

  try {
    graphRaw = await read(GRAPH_PATH);
  } catch (error) {
    if (isMissingArtifact(error)) {
      return { state: "empty" };
    }

    return malformed(GRAPH_PATH, error);
  }

  let graph;

  try {
    graph = KnowledgeGraphSchema.parse(JSON.parse(graphRaw));
  } catch (error) {
    return malformed(GRAPH_PATH, error);
  }

  try {
    const documents: DashboardDocument[] = await Promise.all(
      graph.documents.map(async (document) => ({
        ...document,
        simplified: await loadSimplifiedDocument(read, document.id),
      })),
    );

    return {
      state: "ready",
      graph,
      documents,
    };
  } catch (error) {
    const path = error instanceof Error && error.message.includes(".text-comprehend/")
      ? error.message.slice(error.message.indexOf(".text-comprehend/"))
      : GRAPH_PATH;

    return malformed(path, error);
  }
}
