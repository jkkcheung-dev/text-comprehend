import { describe, it, expect } from "vitest";
import {
  buildSummarizerPrompt,
  buildConceptExtractorPrompt,
  buildArgumentMapperPrompt,
  buildQAGeneratorPrompt,
} from "../index.js";

const SAMPLE_INPUT = {
  documentId: "abc123def456",
  filePath: "docs/example.md",
  title: "Example Document",
  content: "# Example\n\nSome content about AI and education.\n\n## Section 1\n\nDetails here.",
};

describe("buildSummarizerPrompt", () => {
  it("includes document content in the prompt", () => {
    const prompt = buildSummarizerPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("Some content about AI");
  });

  it("includes document ID in the prompt", () => {
    const prompt = buildSummarizerPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("abc123def456");
  });

  it("specifies JSON output format", () => {
    const prompt = buildSummarizerPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("JSON");
  });

  it("requests thesis, overview, and sections", () => {
    const prompt = buildSummarizerPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("thesis");
    expect(prompt).toContain("overview");
    expect(prompt).toContain("sections");
  });
});

describe("buildConceptExtractorPrompt", () => {
  it("includes document content in the prompt", () => {
    const prompt = buildConceptExtractorPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("Some content about AI");
  });

  it("requests concepts with importance levels", () => {
    const prompt = buildConceptExtractorPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("core");
    expect(prompt).toContain("supporting");
    expect(prompt).toContain("peripheral");
  });
});

describe("buildArgumentMapperPrompt", () => {
  it("includes document content in the prompt", () => {
    const prompt = buildArgumentMapperPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("Some content about AI");
  });

  it("requests claims, evidence, assumptions, gaps", () => {
    const prompt = buildArgumentMapperPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("claim");
    expect(prompt).toContain("evidence");
    expect(prompt).toContain("assumptions");
    expect(prompt).toContain("gaps");
  });
});

describe("buildQAGeneratorPrompt", () => {
  it("includes document content in the prompt", () => {
    const prompt = buildQAGeneratorPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("Some content about AI");
  });

  it("requests multiple difficulty levels", () => {
    const prompt = buildQAGeneratorPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("basic");
    expect(prompt).toContain("intermediate");
    expect(prompt).toContain("advanced");
  });

  it("requests multiple facet types", () => {
    const prompt = buildQAGeneratorPrompt(SAMPLE_INPUT);
    expect(prompt).toContain("factual");
    expect(prompt).toContain("inferential");
    expect(prompt).toContain("evaluative");
  });
});
