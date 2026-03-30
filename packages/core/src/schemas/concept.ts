import { z } from "zod";
import { SourceRefSchema } from "./source-ref.js";

export const ConceptNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  importance: z.enum(["core", "supporting", "peripheral"]),
  sourceRefs: z.array(SourceRefSchema),
});

export type ConceptNode = z.infer<typeof ConceptNodeSchema>;
