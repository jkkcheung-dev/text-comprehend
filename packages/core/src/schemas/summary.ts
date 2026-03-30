import { z } from "zod";
import { SourceRefSchema } from "./source-ref.js";

export const SectionSummarySchema = z.object({
  id: z.string(),
  heading: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  sourceRange: SourceRefSchema,
});

export const HierarchicalSummarySchema = z.object({
  thesis: z.string(),
  overview: z.string(),
  sections: z.array(SectionSummarySchema),
});

export type SectionSummary = z.infer<typeof SectionSummarySchema>;
export type HierarchicalSummary = z.infer<typeof HierarchicalSummarySchema>;
