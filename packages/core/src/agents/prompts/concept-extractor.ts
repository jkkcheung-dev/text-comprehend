import type { AgentInput } from "./types.js";

export function buildConceptExtractorPrompt(input: AgentInput): string {
  return `You are a concept extraction specialist. Analyze the following document and extract key concepts, definitions, and relationships between concepts.

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
  "concepts": [
    {
      "id": "<unique concept id, e.g. concept-1>",
      "name": "<concept name>",
      "definition": "<clear, concise definition of the concept as used in this document>",
      "importance": "<core | supporting | peripheral>",
      "sourceRefs": [
        {
          "documentId": "${input.documentId}",
          "startLine": <start line number>,
          "endLine": <end line number>,
          "excerpt": "<excerpt where concept appears>"
        }
      ]
    }
  ],
  "relationships": [
    {
      "source": "<concept id of the source concept>",
      "target": "<concept id of the target concept>",
      "type": "<defines | depends_on | supports | contradicts | exemplifies>",
      "label": "<brief description of the relationship>"
    }
  ]
}

## Rules

1. Identify all significant concepts, terms, and entities in the document.
2. Classify importance:
   - "core": Central to the document's argument or purpose (2-5 per document)
   - "supporting": Important but not central (3-8 per document)
   - "peripheral": Mentioned but not deeply explored (0-5 per document)
3. Definitions should explain the concept as used in THIS document, not generic definitions.
4. Each concept must have at least one source reference with accurate line numbers.
5. Identify relationships between concepts:
   - "defines": One concept defines or explains another
   - "depends_on": One concept requires understanding of another
   - "supports": One concept provides evidence or backing for another
   - "contradicts": Two concepts are in tension or opposition
   - "exemplifies": One concept is an example or instance of another
6. Only include relationships that are clearly supported by the document text.
7. Return ONLY valid JSON, optionally wrapped in a \`\`\`json code fence. No explanation text outside the JSON.`;
}
