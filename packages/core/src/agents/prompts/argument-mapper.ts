import type { AgentInput } from "./types.js";

export function buildArgumentMapperPrompt(input: AgentInput): string {
  return `You are an argument analysis specialist. Analyze the following document and map its argumentative structure.

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
  "arguments": [
    {
      "id": "<unique argument id, e.g. arg-1>",
      "claim": "<the claim being made>",
      "type": "<main | supporting | counter>",
      "parentClaimId": "<id of the main argument this supports/counters, omit for main arguments>",
      "evidence": [
        {
          "content": "<what evidence is provided>",
          "type": "<data | citation | reasoning | example | authority>",
          "strength": "<strong | moderate | weak>",
          "sourceRef": {
            "documentId": "${input.documentId}",
            "startLine": <line>,
            "endLine": <line>,
            "excerpt": "<excerpt>"
          }
        }
      ],
      "assumptions": ["<unstated assumptions underlying the claim>"],
      "gaps": ["<logical gaps, missing evidence, or weaknesses>"],
      "sourceRefs": [
        {
          "documentId": "${input.documentId}",
          "startLine": <line>,
          "endLine": <line>,
          "excerpt": "<excerpt>"
        }
      ]
    }
  ]
}

## Rules

1. Identify the main claim(s) of the document (type: "main").
2. Identify supporting arguments that back the main claims (type: "supporting").
3. Identify any counter-arguments or opposing views (type: "counter").
4. For supporting and counter arguments, set "parentClaimId" to the id of the main argument they relate to. If unclear, pick the most relevant main argument.
5. For each argument, list ALL evidence provided. Classify evidence type and strength.
6. Identify unstated assumptions -- things the author takes for granted.
7. Identify logical gaps -- places where the argument is weak, evidence is missing, or reasoning has flaws.
8. If the document is purely informational with no arguments, return an empty arguments array.
9. Source references must use accurate line numbers.
10. Return ONLY valid JSON, optionally wrapped in a \`\`\`json code fence. No explanation text outside the JSON.`;
}
