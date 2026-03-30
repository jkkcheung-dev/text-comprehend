import { z } from "zod";
import { ArgumentNodeSchema } from "../../schemas/index.js";

export const ArgumentMapperOutputSchema = z.object({
  documentId: z.string(),
  arguments: z.array(ArgumentNodeSchema),
});

export type ArgumentMapperOutput = z.infer<typeof ArgumentMapperOutputSchema>;
