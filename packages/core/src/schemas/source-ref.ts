import { z } from "zod";

export const SourceRefSchema = z.object({
  documentId: z.string(),
  startLine: z.number().int().nonnegative(),
  endLine: z.number().int().nonnegative(),
  excerpt: z.string(),
});

export type SourceRef = z.infer<typeof SourceRefSchema>;
