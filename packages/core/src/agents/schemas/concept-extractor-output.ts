import { z } from "zod";
import { ConceptNodeSchema } from "../../schemas/index.js";

export const ConceptExtractorOutputSchema = z.object({
  documentId: z.string(),
  concepts: z.array(ConceptNodeSchema),
});

export type ConceptExtractorOutput = z.infer<typeof ConceptExtractorOutputSchema>;
