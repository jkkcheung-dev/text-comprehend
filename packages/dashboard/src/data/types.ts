import type { KnowledgeGraph, DocumentNode } from "@text-comprehend/core";

export type DashboardReader = (path: string) => Promise<string>;

export type DashboardSourceMeta =
  | {
      mode: "fixture";
      label: string;
      fixtureName: string;
    }
  | {
      mode: "workspace";
      label: string;
      workspaceRoot: string;
    };

export type DashboardSource = {
  meta: DashboardSourceMeta;
  read: DashboardReader;
};

export type DashboardSimplifiedDocument = {
  layeredSummary: string;
  conceptGlossary: string;
  argumentMap: string;
  comprehensionCheck: string;
};

export type DashboardDocumentDetail =
  | {
      state: "available";
      simplified: DashboardSimplifiedDocument;
    }
  | {
      state: "degraded";
      path: string;
      error: string;
    };

export type DashboardDocument = DocumentNode & {
  detail: DashboardDocumentDetail;
};

export type LoadingDashboardData = {
  state: "loading";
  source: DashboardSourceMeta;
};

export type ReadyDashboardData = {
  state: "ready";
  source: DashboardSourceMeta;
  graph: KnowledgeGraph;
  documents: DashboardDocument[];
};

export type EmptyDashboardData = {
  state: "empty";
  source: DashboardSourceMeta;
};

export type MalformedDashboardData = {
  state: "malformed";
  source: DashboardSourceMeta;
  path: string;
  error: string;
};

export type DashboardData =
  | LoadingDashboardData
  | ReadyDashboardData
  | EmptyDashboardData
  | MalformedDashboardData;
