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

export function createReadyDashboardData(options?: {
  source?: DashboardSourceMeta;
  documents?: DashboardDocument[];
}): ReadyDashboardData {
  return {
    state: "ready",
    source: options?.source ?? createFixtureSource().meta,
    graph: {
      version: "1.0.0",
      generatedAt: "2026-04-28T00:00:00.000Z",
      documents: [],
      edges: [],
    },
    documents:
      options?.documents ?? [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
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
