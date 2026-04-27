import { KnowledgeGraphSchema } from "@text-comprehend/core";
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

async function readArtifact(read: DashboardReader, path: string): Promise<string> {
  try {
    return await read(path);
  } catch (error) {
    throw malformed(path, error);
  }
}

async function loadSimplifiedDocument(read: DashboardReader, documentId: string): Promise<DashboardSimplifiedDocument> {
  const basePath = `.text-comprehend/simplified/${documentId}`;

  const layeredSummary = await readArtifact(read, `${basePath}/layered-summary.md`);
  const conceptGlossary = await readArtifact(read, `${basePath}/concept-glossary.md`);
  const argumentMap = await readArtifact(read, `${basePath}/argument-map.md`);
  const comprehensionCheck = await readArtifact(read, `${basePath}/comprehension-check.md`);

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
    const documents: DashboardDocument[] = [];

    for (const document of graph.documents) {
      documents.push({
        ...document,
        simplified: await loadSimplifiedDocument(read, document.id),
      });
    }

    return {
      state: "ready",
      graph,
      documents,
    };
  } catch (error) {
    if (error && typeof error === "object" && "state" in error && error.state === "malformed") {
      return error as DashboardData;
    }

    return malformed(GRAPH_PATH, error);
  }
}
