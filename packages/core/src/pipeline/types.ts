import type { ReviewReport } from "../schemas/index.js";

export type FacetType = "summary" | "concepts" | "arguments" | "qa";

export interface AgentExecutor {
  (prompt: string): Promise<string>;
}

export interface PipelineOptions {
  rootDir: string;
  batchSize?: number;
  retryFailed?: boolean;
  review?: boolean;
  reviewStrict?: boolean;
  agentExecutor: AgentExecutor;
}

export interface PipelineReviewResult {
  ran: boolean;
  strict: boolean;
  report: ReviewReport | null;
}

export interface FacetResult {
  facetType: FacetType;
  documentId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DocumentResult {
  documentId: string;
  filePath: string;
  title: string;
  facets: Record<FacetType, FacetResult>;
}

export interface PipelineResult {
  documentsProcessed: number;
  documentsSkipped: number;
  facetsSucceeded: number;
  facetsFailed: number;
  results: DocumentResult[];
  errors: string[];
  review: PipelineReviewResult;
}
