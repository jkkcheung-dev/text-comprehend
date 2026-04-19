import { z } from "zod";

export const SourceRefSchema = z.object({
  documentId: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  excerpt: z.string(),
}).refine(
  (data) => data.endLine >= data.startLine,
  { message: "endLine must be >= startLine" },
);

export type SourceRef = z.infer<typeof SourceRefSchema>;
