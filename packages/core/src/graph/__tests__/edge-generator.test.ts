import { describe, it, expect } from "vitest";
import { generateEdges } from "../edge-generator.js";
import type { DocumentNode } from "../../schemas/index.js";

function makeDoc(overrides: Partial<DocumentNode> = {}): DocumentNode {
  return {
    id: "doc-1",
    filePath: "test.md",
    title: "Test",
    fileType: "md",
    lastAnalyzed: "2025-01-01T00:00:00.000Z",
    fileHash: "abc123",
    summary: { thesis: "t", overview: "o", sections: [] },
    concepts: [],
    arguments: [],
    questions: [],
    ...overrides,
  };
}

const ref = { documentId: "doc-1", startLine: 0, endLine: 1, excerpt: "x" };

describe("generateEdges", () => {
  it("generates contains edges for sections", () => {
    const doc = makeDoc({
      summary: {
        thesis: "t",
        overview: "o",
        sections: [{ id: "sec-1", heading: "H", summary: "S", keyPoints: [], sourceRange: ref }],
      },
    });
    const edges = generateEdges([doc], new Map());
    expect(edges).toContainEqual({ source: "doc-1", target: "sec-1", type: "contains" });
  });

  it("generates contains edges for concepts, arguments, questions", () => {
    const doc = makeDoc({
      concepts: [{ id: "c-1", name: "X", definition: "d", importance: "core", sourceRefs: [ref] }],
      arguments: [{ id: "a-1", claim: "c", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] }],
      questions: [{ id: "q-1", question: "?", answer: "a", difficulty: "basic", facet: "factual", sourceRefs: [ref] }],
    });
    const edges = generateEdges([doc], new Map());
    expect(edges).toContainEqual({ source: "doc-1", target: "c-1", type: "contains" });
    expect(edges).toContainEqual({ source: "doc-1", target: "a-1", type: "contains" });
    expect(edges).toContainEqual({ source: "doc-1", target: "q-1", type: "contains" });
  });

  it("generates questions edges from question to document", () => {
    const doc = makeDoc({
      questions: [{ id: "q-1", question: "?", answer: "a", difficulty: "basic", facet: "factual", sourceRefs: [ref] }],
    });
    const edges = generateEdges([doc], new Map());
    expect(edges).toContainEqual({ source: "q-1", target: "doc-1", type: "questions" });
  });

  it("includes concept relationships", () => {
    const doc = makeDoc({
      concepts: [
        { id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] },
        { id: "c-2", name: "B", definition: "d", importance: "supporting", sourceRefs: [ref] },
      ],
    });
    const rels = new Map([["doc-1", [{ source: "c-1", target: "c-2", type: "defines" as const, label: "def" }]]]);
    const edges = generateEdges([doc], rels);
    expect(edges).toContainEqual({ source: "c-1", target: "c-2", type: "defines", label: "def" });
  });

  it("returns empty for empty documents", () => {
    expect(generateEdges([], new Map())).toEqual([]);
  });

  it("generates supports edges from supporting to main arguments", () => {
    const doc = makeDoc({
      arguments: [
        { id: "a-main", claim: "main claim", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
        { id: "a-sup", claim: "supporting claim", type: "supporting", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
      ],
    });
    const edges = generateEdges([doc], new Map());
    expect(edges).toContainEqual({ source: "a-sup", target: "a-main", type: "supports" });
  });

  it("generates contradicts edges from counter to main arguments", () => {
    const doc = makeDoc({
      arguments: [
        { id: "a-main", claim: "main claim", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
        { id: "a-counter", claim: "counter claim", type: "counter", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
      ],
    });
    const edges = generateEdges([doc], new Map());
    expect(edges).toContainEqual({ source: "a-counter", target: "a-main", type: "contradicts" });
  });

  it("generates supports and contradicts edges to all main arguments", () => {
    const doc = makeDoc({
      arguments: [
        { id: "a-m1", claim: "main 1", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
        { id: "a-m2", claim: "main 2", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
        { id: "a-sup", claim: "sup", type: "supporting", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
      ],
    });
    const edges = generateEdges([doc], new Map());
    expect(edges).toContainEqual({ source: "a-sup", target: "a-m1", type: "supports" });
    expect(edges).toContainEqual({ source: "a-sup", target: "a-m2", type: "supports" });
  });
});
