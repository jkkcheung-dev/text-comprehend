import type { AgentInput } from "./types.js";

export function buildConceptExtractorPrompt(input: AgentInput): string {
  return `You are a concept extraction specialist. Analyze the following document and extract key concepts, definitions, and relationships.

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
5. Return ONLY valid JSON. No markdown fences, no explanation text.`;
}
