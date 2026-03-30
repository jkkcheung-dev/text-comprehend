import { z } from "zod";
import { DocumentNodeSchema } from "./document-node.js";

export const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum([
    "contains",
    "supports",
    "contradicts",
    "defines",
    "depends_on",
    "exemplifies",
    "questions",
  ]),
  label: z.string().optional(),
  weight: z.number().min(0).max(1).optional(),
});

export const KnowledgeGraphSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  documents: z.array(DocumentNodeSchema),
  edges: z.array(EdgeSchema),
});

export type Edge = z.infer<typeof EdgeSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
