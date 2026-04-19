import { z } from "zod";
import { SourceRefSchema } from "./source-ref.js";

export const EvidenceSchema = z.object({
  content: z.string(),
  type: z.enum(["data", "citation", "reasoning", "example", "authority"]),
  strength: z.enum(["strong", "moderate", "weak"]),
  sourceRef: SourceRefSchema,
});

export const ArgumentNodeSchema = z.object({
  id: z.string(),
  claim: z.string(),
  type: z.enum(["main", "supporting", "counter"]),
  evidence: z.array(EvidenceSchema),
  assumptions: z.array(z.string()),
  gaps: z.array(z.string()),
  sourceRefs: z.array(SourceRefSchema),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type ArgumentNode = z.infer<typeof ArgumentNodeSchema>;
