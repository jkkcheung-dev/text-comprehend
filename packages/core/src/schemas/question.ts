import { z } from "zod";
import { SourceRefSchema } from "./source-ref.js";

export const QuestionNodeSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  difficulty: z.enum(["basic", "intermediate", "advanced"]),
  facet: z.enum(["factual", "inferential", "evaluative"]),
  sourceRefs: z.array(SourceRefSchema),
});

export type QuestionNode = z.infer<typeof QuestionNodeSchema>;
