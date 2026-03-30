import { describe, it, expect } from "vitest";
import {
  SummarizerOutputSchema,
  ConceptExtractorOutputSchema,
  ArgumentMapperOutputSchema,
  QAGeneratorOutputSchema,
} from "../index.js";

describe("SummarizerOutputSchema", () => {
  it("validates a complete summarizer response", () => {
    const valid = {
      documentId: "abc123def456",
      summary: {
        thesis: "AI will transform education",
        overview: "This document explores...",
        sections: [
          {
            id: "sec-1",
            heading: "Introduction",
            summary: "Sets the stage for...",
            keyPoints: ["AI is growing", "Education needs reform"],
            sourceRange: {
              documentId: "abc123def456",
              startLine: 1,
              endLine: 10,
              excerpt: "AI is transforming...",
            },
          },
        ],
      },
    };
    expect(SummarizerOutputSchema.parse(valid)).toEqual(valid);
  });
});

describe("ConceptExtractorOutputSchema", () => {
  it("validates concept extraction output", () => {
    const valid = {
      documentId: "abc123def456",
      concepts: [
        {
          id: "concept-1",
          name: "Machine Learning",
          definition: "A subset of AI",
          importance: "core" as const,
          sourceRefs: [
            {
              documentId: "abc123def456",
              startLine: 3,
              endLine: 5,
              excerpt: "Machine learning...",
            },
          ],
        },
      ],
    };
    expect(ConceptExtractorOutputSchema.parse(valid)).toEqual(valid);
  });
});

describe("ArgumentMapperOutputSchema", () => {
  it("validates argument mapping output", () => {
    const valid = {
      documentId: "abc123def456",
      arguments: [
        {
          id: "arg-1",
          claim: "AI improves learning outcomes",
          type: "main" as const,
          evidence: [
            {
              content: "30% improvement in test scores",
              type: "data" as const,
              strength: "strong" as const,
              sourceRef: {
                documentId: "abc123def456",
                startLine: 8,
                endLine: 9,
                excerpt: "Studies show...",
              },
            },
          ],
          assumptions: ["Access to technology"],
          gaps: ["Limited long-term data"],
          sourceRefs: [],
        },
      ],
    };
    expect(ArgumentMapperOutputSchema.parse(valid)).toEqual(valid);
  });
});

describe("QAGeneratorOutputSchema", () => {
  it("validates QA generation output", () => {
    const valid = {
      documentId: "abc123def456",
      questions: [
        {
          id: "q-1",
          question: "What is the main benefit of AI in education?",
          answer: "24/7 availability and personalized learning",
          difficulty: "basic" as const,
          facet: "factual" as const,
          sourceRefs: [
            {
              documentId: "abc123def456",
              startLine: 8,
              endLine: 10,
              excerpt: "AI tutoring systems...",
            },
          ],
        },
      ],
    };
    expect(QAGeneratorOutputSchema.parse(valid)).toEqual(valid);
  });
});
