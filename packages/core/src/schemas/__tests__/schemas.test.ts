import { describe, it, expect } from "vitest";
import {
  SourceRefSchema,
  HierarchicalSummarySchema,
  ConceptNodeSchema,
  ArgumentNodeSchema,
  QuestionNodeSchema,
  DocumentNodeSchema,
  KnowledgeGraphSchema,
  ManifestSchema,
  EdgeSchema,
  ReviewReportSchema,
} from "../index.js";

describe("SourceRefSchema", () => {
  it("validates a correct source reference", () => {
    const valid = {
      documentId: "abc123def456",
      startLine: 1,
      endLine: 10,
      excerpt: "Some text from the document",
    };
    expect(SourceRefSchema.parse(valid)).toEqual(valid);
  });

  it("accepts equal startLine and endLine", () => {
    const valid = {
      documentId: "abc123def456",
      startLine: 5,
      endLine: 5,
      excerpt: "Single line",
    };
    expect(SourceRefSchema.parse(valid)).toEqual(valid);
  });

  it("rejects missing fields", () => {
    expect(() => SourceRefSchema.parse({ documentId: "abc" })).toThrow();
  });

  it("rejects endLine less than startLine", () => {
    expect(() =>
      SourceRefSchema.parse({
        documentId: "abc123def456",
        startLine: 10,
        endLine: 5,
        excerpt: "Invalid range",
      })
    ).toThrow();
  });

  it("rejects zero line numbers", () => {
    expect(() =>
      SourceRefSchema.parse({
        documentId: "abc123def456",
        startLine: 0,
        endLine: 1,
        excerpt: "Invalid line",
      })
    ).toThrow();
  });
});

describe("HierarchicalSummarySchema", () => {
  it("validates a complete summary", () => {
    const valid = {
      thesis: "Main point of the document",
      overview: "A paragraph overview of the content.",
      sections: [
        {
          id: "sec-1",
          heading: "Introduction",
          summary: "The introduction covers...",
          keyPoints: ["Point 1", "Point 2"],
          sourceRange: {
            documentId: "abc123def456",
            startLine: 1,
            endLine: 20,
            excerpt: "Introduction text",
          },
        },
      ],
    };
    expect(HierarchicalSummarySchema.parse(valid)).toEqual(valid);
  });
});

describe("ConceptNodeSchema", () => {
  it("validates a concept node", () => {
    const valid = {
      id: "concept-1",
      name: "Machine Learning",
      definition: "A subset of AI that learns from data",
      importance: "core" as const,
      sourceRefs: [
        {
          documentId: "abc123def456",
          startLine: 5,
          endLine: 8,
          excerpt: "Machine learning is...",
        },
      ],
    };
    expect(ConceptNodeSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid importance level", () => {
    expect(() =>
      ConceptNodeSchema.parse({
        id: "c1",
        name: "X",
        definition: "Y",
        importance: "critical",
        sourceRefs: [],
      })
    ).toThrow();
  });
});

describe("ArgumentNodeSchema", () => {
  it("validates an argument node", () => {
    const valid = {
      id: "arg-1",
      claim: "AI will transform education",
      type: "main" as const,
      evidence: [
        {
          content: "Studies show 30% improvement",
          type: "data" as const,
          strength: "strong" as const,
          sourceRef: {
            documentId: "abc123def456",
            startLine: 15,
            endLine: 18,
            excerpt: "Studies show...",
          },
        },
      ],
      assumptions: ["Technology access is universal"],
      gaps: ["No long-term studies exist"],
      sourceRefs: [],
    };
    expect(ArgumentNodeSchema.parse(valid)).toEqual(valid);
  });
});

describe("QuestionNodeSchema", () => {
  it("validates a question node", () => {
    const valid = {
      id: "q-1",
      question: "What is the main argument?",
      answer: "The main argument is...",
      difficulty: "basic" as const,
      facet: "factual" as const,
      sourceRefs: [],
    };
    expect(QuestionNodeSchema.parse(valid)).toEqual(valid);
  });
});

describe("DocumentNodeSchema", () => {
  it("validates a document node", () => {
    const valid = {
      id: "abc123def456",
      filePath: "docs/example.md",
      title: "Example Document",
      fileType: "md",
      lastAnalyzed: "2026-03-31T00:00:00.000Z",
      fileHash: "sha256-abc123",
      summary: {
        thesis: "Main point",
        overview: "Overview paragraph",
        sections: [],
      },
      concepts: [],
      arguments: [],
      questions: [],
    };
    expect(DocumentNodeSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid fileType", () => {
    expect(() =>
      DocumentNodeSchema.parse({
        id: "abc123def456",
        filePath: "docs/example.xyz",
        title: "Example",
        fileType: "xyz",
        lastAnalyzed: "2026-03-31T00:00:00.000Z",
        fileHash: "sha256-abc123",
        summary: { thesis: "X", overview: "Y", sections: [] },
        concepts: [],
        arguments: [],
        questions: [],
      })
    ).toThrow();
  });

  it("rejects non-ISO-8601 lastAnalyzed", () => {
    expect(() =>
      DocumentNodeSchema.parse({
        id: "abc123def456",
        filePath: "docs/example.md",
        title: "Example",
        fileType: "md",
        lastAnalyzed: "March 31, 2026",
        fileHash: "sha256-abc123",
        summary: { thesis: "X", overview: "Y", sections: [] },
        concepts: [],
        arguments: [],
        questions: [],
      })
    ).toThrow();
  });
});

describe("EdgeSchema", () => {
  it("validates an edge", () => {
    const valid = {
      source: "abc123def456",
      target: "concept-1",
      type: "contains" as const,
      label: "has concept",
      weight: 0.8,
    };
    expect(EdgeSchema.parse(valid)).toEqual(valid);
  });

  it("allows optional fields to be absent", () => {
    const minimal = {
      source: "a",
      target: "b",
      type: "defines" as const,
    };
    expect(EdgeSchema.parse(minimal)).toEqual(minimal);
  });
});

describe("KnowledgeGraphSchema", () => {
  it("validates an empty knowledge graph", () => {
    const valid = {
      version: "1.0.0",
      generatedAt: "2026-03-31T00:00:00.000Z",
      documents: [],
      edges: [],
    };
    expect(KnowledgeGraphSchema.parse(valid)).toEqual(valid);
  });

  it("rejects non-ISO-8601 generatedAt", () => {
    expect(() =>
      KnowledgeGraphSchema.parse({
        version: "1.0.0",
        generatedAt: "not-a-timestamp",
        documents: [],
        edges: [],
      })
    ).toThrow();
  });
});

describe("ManifestSchema", () => {
  it("validates a manifest with file entries", () => {
    const valid = {
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {
        "docs/example.md": {
          documentId: "abc123def456",
          title: "Example Document",
          fileHash: "sha256-abc123",
          lastAnalyzed: "2026-03-31T00:00:00.000Z",
          facets: {
            summary: { status: "success" as const },
            concepts: { status: "success" as const },
            arguments: { status: "success" as const },
            qa: { status: "success" as const },
          },
        },
      },
    };
    expect(ManifestSchema.parse(valid)).toEqual(valid);
  });

  it("validates a manifest with failed facets", () => {
    const valid = {
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {
        "docs/example.md": {
          documentId: "abc123def456",
          title: "Example Document",
          fileHash: "sha256-abc123",
          lastAnalyzed: "2026-03-31T00:00:00.000Z",
          facets: {
            summary: { status: "success" as const },
            concepts: { status: "failed" as const, error: "Agent timed out" },
            arguments: { status: "success" as const },
            qa: { status: "pending" as const },
          },
        },
      },
    };
    expect(ManifestSchema.parse(valid)).toEqual(valid);
  });

  it("rejects non-ISO-8601 lastRun", () => {
    expect(() =>
      ManifestSchema.parse({
        version: "1.0.0",
        lastRun: "yesterday",
        files: {},
      })
    ).toThrow();
  });
});

describe("ReviewReportSchema", () => {
  it("validates a review report with mixed severities", () => {
    const valid = {
      version: "1.0.0",
      generatedAt: "2026-04-25T00:00:00.000Z",
      strict: true,
      summary: {
        errors: 1,
        warnings: 2,
        passed: false,
      },
      findings: [
        {
          severity: "error",
          code: "INVALID_SOURCE_RANGE",
          documentId: "doc-1",
          filePath: "doc.md",
          message: "Source range exceeds the file length.",
        },
        {
          severity: "warning",
          code: "LOW_CONFIDENCE_SUMMARY",
          documentId: "doc-1",
          filePath: "doc.md",
          message: "Summary facet succeeded but thesis is blank.",
        },
      ],
    };

    expect(ReviewReportSchema.parse(valid)).toEqual(valid);
  });
});
