import { z } from "zod";
import { HierarchicalSummarySchema } from "./summary.js";
import { ConceptNodeSchema } from "./concept.js";
import { ArgumentNodeSchema } from "./argument.js";
import { QuestionNodeSchema } from "./question.js";

export const DocumentNodeSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  title: z.string(),
  fileType: z.string(),
  lastAnalyzed: z.string(),
  fileHash: z.string(),
  summary: HierarchicalSummarySchema,
  concepts: z.array(ConceptNodeSchema),
  arguments: z.array(ArgumentNodeSchema),
  questions: z.array(QuestionNodeSchema),
});

export type DocumentNode = z.infer<typeof DocumentNodeSchema>;
