import { z } from "zod";
import { HierarchicalSummarySchema } from "../../schemas/index.js";

export const SummarizerOutputSchema = z.object({
  documentId: z.string(),
  summary: HierarchicalSummarySchema,
});

export type SummarizerOutput = z.infer<typeof SummarizerOutputSchema>;
