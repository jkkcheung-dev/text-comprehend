import { z } from "zod";
import { ConceptNodeSchema } from "../../schemas/index.js";
import { EdgeSchema } from "../../schemas/knowledge-graph.js";

export const ConceptExtractorOutputSchema = z.object({
  documentId: z.string(),
  concepts: z.array(ConceptNodeSchema),
  relationships: z.array(EdgeSchema),
});

export type ConceptExtractorOutput = z.infer<typeof ConceptExtractorOutputSchema>;
