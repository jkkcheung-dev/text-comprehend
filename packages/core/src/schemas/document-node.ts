import { z } from "zod";
import { HierarchicalSummarySchema } from "./summary.js";
import { ConceptNodeSchema } from "./concept.js";
import { ArgumentNodeSchema } from "./argument.js";
import { QuestionNodeSchema } from "./question.js";

export const SUPPORTED_FILE_TYPES = [
  "md", "txt", "pdf", "rst", "html", "docx",
] as const;

export const DocumentNodeSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  title: z.string(),
  fileType: z.enum(SUPPORTED_FILE_TYPES),
  lastAnalyzed: z.string().datetime(),
  fileHash: z.string(),
  summary: HierarchicalSummarySchema,
  concepts: z.array(ConceptNodeSchema),
  arguments: z.array(ArgumentNodeSchema),
  questions: z.array(QuestionNodeSchema),
});

export type DocumentNode = z.infer<typeof DocumentNodeSchema>;
