import type { Edge } from "@text-comprehend/core";
import type {
  DashboardData,
  DashboardDocument,
  DashboardDocumentDetail,
  DashboardSource,
  DashboardSourceMeta,
  ReadyDashboardData,
} from "../data/types";

export function createFixtureSource(): DashboardSource {
  return {
    meta: {
      mode: "fixture",
      label: "Fixture: dashboard-workspace",
      fixtureName: "dashboard-workspace",
    },
    read: async () => "",
  };
}

export function createWorkspaceSource(workspaceRoot: string): DashboardSource {
  return {
    meta: {
      mode: "workspace",
      label: `Workspace: ${workspaceRoot}`,
      workspaceRoot,
    },
    read: async () => "",
  };
}

export function createAvailableDetail(layeredSummary: string): DashboardDocumentDetail {
  return {
    state: "available",
    simplified: {
      layeredSummary,
      conceptGlossary: "# Glossary",
      argumentMap: "# Argument Map",
      comprehensionCheck: "# Questions",
    },
  };
}

export function createDegradedDetail(path: string, error: string): DashboardDocumentDetail {
  return {
    state: "degraded",
    path,
    error,
  };
}

export function createDocument(
  id: string,
  title: string,
  detail: DashboardDocumentDetail,
): DashboardDocument {
  return {
    id,
    filePath: `docs/${id}.md`,
    title,
    fileType: "md",
    lastAnalyzed: "2026-04-28T00:00:00.000Z",
    fileHash: `hash-${id}`,
    summary: { thesis: "Thesis", overview: "Overview", sections: [] },
    concepts: [],
    arguments: [],
    questions: [],
    detail,
  };
}

export function createConcept(id: string, name: string, definition = `${name} definition`) {
  return {
    id,
    name,
    definition,
    importance: "core" as const,
    sourceRefs: [],
  };
}

export function createArgument(
  id: string,
  claim: string,
  type: "main" | "supporting" | "counter" = "main",
) {
  return {
    id,
    claim,
    type,
    evidence: [],
    assumptions: ["Assumption"],
    gaps: ["Gap"],
    sourceRefs: [],
  };
}

export function createQuestion(id: string, question: string) {
  return {
    id,
    question,
    answer: "Answer",
    difficulty: "basic" as const,
    facet: "factual" as const,
    sourceRefs: [],
  };
}

export function createGraphEdge(source: string, target: string, type: Edge["type"]): Edge {
  return { source, target, type };
}

export function createReadyDashboardData(options?: {
  source?: DashboardSourceMeta;
  documents?: DashboardDocument[];
  graphEdges?: Edge[];
}): ReadyDashboardData {
  const documents =
    options?.documents ?? [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))];

  return {
    state: "ready",
    source: options?.source ?? createFixtureSource().meta,
    graph: {
      version: "1.0.0",
      generatedAt: "2026-04-28T00:00:00.000Z",
      documents,
      edges: options?.graphEdges ?? [],
    },
    documents,
  };
}

export function createEmptyDashboardData(source: DashboardSourceMeta = createFixtureSource().meta): DashboardData {
  return {
    state: "empty",
    source,
  };
}

export function createMalformedDashboardData(
  source: DashboardSourceMeta = createFixtureSource().meta,
): DashboardData {
  return {
    state: "malformed",
    source,
    path: ".text-comprehend/knowledge-graph.json",
    error: "Unexpected token",
  };
}
