import type { AgentInput } from "./types.js";

export function buildSummarizerPrompt(input: AgentInput): string {
  return `You are a document summarization specialist. Analyze the following document and produce a hierarchical summary.

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
  "summary": {
    "thesis": "<one sentence capturing the core message of the entire document>",
    "overview": "<one paragraph summary of the document>",
    "sections": [
      {
        "id": "<unique section id, e.g. sec-1>",
        "heading": "<section heading or inferred topic>",
        "summary": "<paragraph summary of the section>",
        "keyPoints": ["<key point 1>", "<key point 2>"],
        "sourceRange": {
          "documentId": "${input.documentId}",
          "startLine": <start line number>,
          "endLine": <end line number>,
          "excerpt": "<brief excerpt from the source text>"
        }
      }
    ]
  }
}

## Rules

1. The thesis must be a single sentence that captures the document's core message.
2. The overview must be a single paragraph (3-5 sentences).
3. Create one section entry per logical section in the document. If the document has headings, use them. If not, infer logical sections.
4. Each section must have 2-5 key points.
5. Source references must use accurate line numbers from the document content above.
6. Return ONLY valid JSON. No markdown fences, no explanation text.`;
}
