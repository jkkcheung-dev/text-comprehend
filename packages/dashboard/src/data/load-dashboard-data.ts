import { KnowledgeGraphSchema } from "@text-comprehend/core/schemas";
import type {
  DashboardData,
  DashboardDocument,
  DashboardDocumentDetail,
  DashboardReader,
  DashboardSimplifiedDocument,
  DashboardSource,
  DashboardSourceMeta,
} from "./types";

const GRAPH_PATH = ".text-comprehend/knowledge-graph.json";

type ArtifactFailure = {
  path: string;
  error: string;
};

function isMissingArtifact(error: unknown): boolean {
  return error instanceof Error && error.message.includes("ENOENT");
}

function createArtifactFailure(path: string, error: unknown): ArtifactFailure {
  const errorMessage =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : String(error);

  return {
    path,
    error: errorMessage,
  };
}

function malformed(source: DashboardSourceMeta, path: string, error: unknown): DashboardData {
  const failure = createArtifactFailure(path, error);

  return {
    state: "malformed",
    source,
    path: failure.path,
    error: failure.error,
  };
}

async function readArtifact(read: DashboardReader, path: string): Promise<string> {
  try {
    return await read(path);
  } catch (error) {
    const failure = createArtifactFailure(path, error);
    throw new Error(`${failure.path}\n${failure.error}`);
  }
}

async function loadSimplifiedDocument(
  read: DashboardReader,
  documentId: string,
): Promise<DashboardDocumentDetail> {
  const basePath = `.text-comprehend/simplified/${documentId}`;

  try {
    const layeredSummary = await readArtifact(read, `${basePath}/layered-summary.md`);
    const conceptGlossary = await readArtifact(read, `${basePath}/concept-glossary.md`);
    const argumentMap = await readArtifact(read, `${basePath}/argument-map.md`);
    const comprehensionCheck = await readArtifact(read, `${basePath}/comprehension-check.md`);

    const simplified: DashboardSimplifiedDocument = {
      layeredSummary,
      conceptGlossary,
      argumentMap,
      comprehensionCheck,
    };

    return {
      state: "available",
      simplified,
    };
  } catch (error) {
    const [path, detailError] =
      error instanceof Error ? error.message.split("\n", 2) : [basePath, String(error)];

    return {
      state: "degraded",
      path,
      error: detailError ?? path,
    };
  }
}

export async function loadDashboardData(source: DashboardSource): Promise<DashboardData> {
  const { meta, read } = source;
  let graphRaw: string;

  try {
    graphRaw = await read(GRAPH_PATH);
  } catch (error) {
    if (isMissingArtifact(error)) {
      return { state: "empty", source: meta };
    }

    return malformed(meta, GRAPH_PATH, error);
  }

  let graph;

  try {
    graph = KnowledgeGraphSchema.parse(JSON.parse(graphRaw));
  } catch (error) {
    return malformed(meta, GRAPH_PATH, error);
  }

  const documents: DashboardDocument[] = [];

  for (const document of graph.documents) {
    documents.push({
      ...document,
      detail: await loadSimplifiedDocument(read, document.id),
    });
  }

  return {
    state: "ready",
    source: meta,
    graph,
    documents,
  };
}
