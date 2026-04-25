import { z } from "zod";

export const ReviewFindingSeveritySchema = z.enum(["error", "warning"]);

export const ReviewFindingCodeSchema = z.enum([
  "MISSING_GRAPH_DOCUMENT",
  "MISSING_FACET_CONTENT",
  "ORPHAN_NODE",
  "MISSING_SOURCE_DOCUMENT",
  "MISSING_SOURCE_FILE",
  "INVALID_SOURCE_RANGE",
  "EMPTY_SOURCE_EXCERPT",
  "WEAK_SOURCE_EXCERPT_MATCH",
  "LOW_CONFIDENCE_SUMMARY",
  "LOW_CONFIDENCE_CONCEPT",
  "LOW_CONFIDENCE_ARGUMENT",
  "LOW_CONFIDENCE_QUESTION",
]);

export const ReviewFindingSchema = z.object({
  severity: ReviewFindingSeveritySchema,
  code: ReviewFindingCodeSchema,
  message: z.string(),
  documentId: z.string().optional(),
  filePath: z.string().optional(),
  nodeId: z.string().optional(),
});

export const ReviewReportSchema = z.object({
  version: z.string(),
  generatedAt: z.string().datetime(),
  strict: z.boolean(),
  summary: z.object({
    errors: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    passed: z.boolean(),
  }),
  findings: z.array(ReviewFindingSchema),
});

export type ReviewFindingSeverity = z.infer<typeof ReviewFindingSeveritySchema>;
export type ReviewFindingCode = z.infer<typeof ReviewFindingCodeSchema>;
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;
export type ReviewReport = z.infer<typeof ReviewReportSchema>;
