import { z } from "zod";
import { QuestionNodeSchema } from "../../schemas/index.js";

export const QAGeneratorOutputSchema = z.object({
  documentId: z.string(),
  questions: z.array(QuestionNodeSchema),
});

export type QAGeneratorOutput = z.infer<typeof QAGeneratorOutputSchema>;
