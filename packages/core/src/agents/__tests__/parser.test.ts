import { describe, it, expect } from "vitest";
import { parseAgentResponse } from "../parser.js";
import { SummarizerOutputSchema } from "../schemas/index.js";

describe("parseAgentResponse", () => {
  it("parses valid JSON response", () => {
    const json = JSON.stringify({
      documentId: "abc123def456",
      summary: {
        thesis: "Main point",
        overview: "Overview paragraph",
        sections: [],
      },
    });

    const result = parseAgentResponse(json, SummarizerOutputSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentId).toBe("abc123def456");
    }
  });

  it("extracts JSON from markdown code fences", () => {
    const response = `Here is the analysis:

\`\`\`json
{
  "documentId": "abc123def456",
  "summary": {
    "thesis": "Main point",
    "overview": "Overview paragraph",
    "sections": []
  }
}
\`\`\`

Hope this helps!`;

    const result = parseAgentResponse(response, SummarizerOutputSchema);
    expect(result.success).toBe(true);
  });

  it("returns error for invalid JSON", () => {
    const result = parseAgentResponse("not json at all", SummarizerOutputSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it("returns error for JSON that fails schema validation", () => {
    const json = JSON.stringify({
      documentId: "abc123def456",
      summary: {
        thesis: "Main point",
        // missing 'overview' and 'sections'
      },
    });

    const result = parseAgentResponse(json, SummarizerOutputSchema);
    expect(result.success).toBe(false);
  });

  it("handles JSON with surrounding whitespace", () => {
    const json = `  \n  ${JSON.stringify({
      documentId: "abc123def456",
      summary: {
        thesis: "Main point",
        overview: "Overview paragraph",
        sections: [],
      },
    })}  \n  `;

    const result = parseAgentResponse(json, SummarizerOutputSchema);
    expect(result.success).toBe(true);
  });

  it("extracts JSON from the last valid code fence when multiple fences exist", () => {
    const response = `Here is an example of a bad format:

\`\`\`json
{ "bad": "data" }
\`\`\`

And here is the actual analysis:

\`\`\`json
{
  "documentId": "abc123def456",
  "summary": {
    "thesis": "Main point",
    "overview": "Overview paragraph",
    "sections": []
  }
}
\`\`\`

Done!`;

    const result = parseAgentResponse(response, SummarizerOutputSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentId).toBe("abc123def456");
    }
  });

  it("falls back to earlier fence if last fence is not valid JSON", () => {
    const response = `Here is the result:

\`\`\`json
{
  "documentId": "abc123def456",
  "summary": {
    "thesis": "Main point",
    "overview": "Overview paragraph",
    "sections": []
  }
}
\`\`\`

Note: the above is formatted like this:
\`\`\`
key: value
\`\`\``;

    const result = parseAgentResponse(response, SummarizerOutputSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentId).toBe("abc123def456");
    }
  });
});
