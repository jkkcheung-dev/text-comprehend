import { z } from "zod";
import { ConceptNodeSchema } from "../../schemas/index.js";

/**
 * Narrower edge schema for concept-to-concept relationships.
 * Only includes relationship types that make sense between concepts,
 * excluding graph-level types like "contains" and "questions" which
 * are added by the graph-builder in Phase 5.
 */
export const ConceptRelationshipSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum([
    "defines",
    "depends_on",
    "supports",
    "contradicts",
    "exemplifies",
  ]),
  label: z.string().optional(),
  weight: z.number().min(0).max(1).optional(),
});

export const ConceptExtractorOutputSchema = z.object({
  documentId: z.string(),
  concepts: z.array(ConceptNodeSchema),
  relationships: z.array(ConceptRelationshipSchema),
});

export type ConceptExtractorOutput = z.infer<typeof ConceptExtractorOutputSchema>;
