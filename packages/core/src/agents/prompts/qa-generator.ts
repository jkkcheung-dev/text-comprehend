import type { AgentInput } from "./types.js";

export function buildQAGeneratorPrompt(input: AgentInput): string {
  return `You are a comprehension assessment specialist. Analyze the following document and generate questions that test understanding at multiple levels.

## Document Information
- Document ID: ${input.documentId}
- File: ${input.filePath}
- Title: ${input.title}

## Document Content

${input.content}

## Your Task

Produce a JSON object with the following structure:

{
  "documentId": "${input.documentId}",
  "questions": [
    {
      "id": "<unique question id, e.g. q-1>",
      "question": "<the comprehension question>",
      "answer": "<the expected answer>",
      "difficulty": "<basic | intermediate | advanced>",
      "facet": "<factual | inferential | evaluative>",
      "sourceRefs": [
        {
          "documentId": "${input.documentId}",
          "startLine": <line>,
          "endLine": <line>,
          "excerpt": "<excerpt containing the answer>"
        }
      ]
    }
  ]
}

## Rules

1. Generate 6-10 questions per document.
2. Include a mix of difficulty levels:
   - "basic": Can be answered directly from the text (2-3 questions)
   - "intermediate": Requires connecting ideas from different parts (2-4 questions)
   - "advanced": Requires critical evaluation or synthesis (2-3 questions)
3. Include a mix of facet types:
   - "factual": Tests recall of stated facts
   - "inferential": Tests ability to draw conclusions not explicitly stated
   - "evaluative": Tests critical assessment of arguments, evidence, or claims
4. Answers should be thorough but concise (1-3 sentences).
5. Each question must reference specific parts of the source document.
6. Return ONLY valid JSON, optionally wrapped in a \`\`\`json code fence. No explanation text outside the JSON.`;
}
