import type { KnowledgeGraph, DocumentNode } from "../../../core/src/schemas/index.js";

export type DashboardReader = (path: string) => Promise<string>;

export type DashboardSimplifiedDocument = {
  layeredSummary: string;
  conceptGlossary: string;
  argumentMap: string;
  comprehensionCheck: string;
};

export type DashboardDocument = DocumentNode & {
  simplified: DashboardSimplifiedDocument;
};

export type ReadyDashboardData = {
  state: "ready";
  graph: KnowledgeGraph;
  documents: DashboardDocument[];
};

export type EmptyDashboardData = {
  state: "empty";
};

export type MalformedDashboardData = {
  state: "malformed";
  path: string;
  error: string;
};

export type DashboardData = ReadyDashboardData | EmptyDashboardData | MalformedDashboardData;
