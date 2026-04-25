export type FacetType = "summary" | "concepts" | "arguments" | "qa";

export interface AgentExecutor {
  (prompt: string): Promise<string>;
}

export interface PipelineOptions {
  rootDir: string;
  batchSize?: number;
  retryFailed?: boolean;
  agentExecutor: AgentExecutor;
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
}
