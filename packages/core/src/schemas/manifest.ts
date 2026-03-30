import { z } from "zod";

export const FacetStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success") }),
  z.object({ status: z.literal("failed"), error: z.string() }),
  z.object({ status: z.literal("pending") }),
]);

export const ManifestFileEntrySchema = z.object({
  documentId: z.string(),
  fileHash: z.string(),
  lastAnalyzed: z.string(),
  facets: z.object({
    summary: FacetStatusSchema,
    concepts: FacetStatusSchema,
    arguments: FacetStatusSchema,
    qa: FacetStatusSchema,
  }),
});

export const ManifestSchema = z.object({
  version: z.string(),
  lastRun: z.string(),
  files: z.record(z.string(), ManifestFileEntrySchema),
});

export type FacetStatus = z.infer<typeof FacetStatusSchema>;
export type ManifestFileEntry = z.infer<typeof ManifestFileEntrySchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
