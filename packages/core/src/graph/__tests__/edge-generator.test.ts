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

const ref = { documentId: "doc-1", startLine: 1, endLine: 1, excerpt: "x" };

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

  it("links supporting arguments to the nearest main argument by source line", () => {
    const doc = makeDoc({
      arguments: [
        { id: "a-m1", claim: "main 1", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [{ ...ref, startLine: 1 }] },
        { id: "a-m2", claim: "main 2", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [{ ...ref, startLine: 50 }] },
        { id: "a-sup", claim: "sup", type: "supporting", evidence: [], assumptions: [], gaps: [], sourceRefs: [{ ...ref, startLine: 48 }] },
      ],
    });
    const edges = generateEdges([doc], new Map());
    // sup at line 48 is closer to m2 at line 50
    expect(edges).toContainEqual({ source: "a-sup", target: "a-m2", type: "supports" });
    expect(edges).not.toContainEqual({ source: "a-sup", target: "a-m1", type: "supports" });
  });

  it("links counter arguments to the nearest main argument by source line", () => {
    const doc = makeDoc({
      arguments: [
        { id: "a-m1", claim: "main 1", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [{ ...ref, startLine: 5 }] },
        { id: "a-m2", claim: "main 2", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [{ ...ref, startLine: 30 }] },
        { id: "a-counter", claim: "counter", type: "counter", evidence: [], assumptions: [], gaps: [], sourceRefs: [{ ...ref, startLine: 6 }] },
      ],
    });
    const edges = generateEdges([doc], new Map());
    expect(edges).toContainEqual({ source: "a-counter", target: "a-m1", type: "contradicts" });
    expect(edges).not.toContainEqual({ source: "a-counter", target: "a-m2", type: "contradicts" });
  });

  it("does not create edges to synthetic evidence nodes", () => {
    const doc = makeDoc({
      arguments: [
        {
          id: "a-1", claim: "claim", type: "main",
          evidence: [
            { content: "data point", type: "data", strength: "strong", sourceRef: ref },
            { content: "citation", type: "citation", strength: "moderate", sourceRef: ref },
          ],
          assumptions: [], gaps: [], sourceRefs: [ref],
        },
      ],
    });
    const edges = generateEdges([doc], new Map());
    expect(edges.some((edge) => edge.source.startsWith("a-1-ev-"))).toBe(false);
    expect(edges.some((edge) => edge.target.startsWith("a-1-ev-"))).toBe(false);
  });

  it("includes depends_on concept relationships", () => {
    const doc = makeDoc({
      concepts: [
        { id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] },
        { id: "c-2", name: "B", definition: "d", importance: "core", sourceRefs: [ref] },
      ],
    });
    const rels = new Map([["doc-1", [{ source: "c-1", target: "c-2", type: "depends_on" as const }]]]);
    const edges = generateEdges([doc], rels);
    expect(edges).toContainEqual({ source: "c-1", target: "c-2", type: "depends_on" });
  });

  it("includes exemplifies concept relationships", () => {
    const doc = makeDoc({
      concepts: [
        { id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] },
        { id: "c-2", name: "B", definition: "d", importance: "core", sourceRefs: [ref] },
      ],
    });
    const rels = new Map([["doc-1", [{ source: "c-1", target: "c-2", type: "exemplifies" as const, label: "example" }]]]);
    const edges = generateEdges([doc], rels);
    expect(edges).toContainEqual({ source: "c-1", target: "c-2", type: "exemplifies", label: "example" });
  });

  it("passes through weight on concept relationships", () => {
    const doc = makeDoc({
      concepts: [
        { id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] },
        { id: "c-2", name: "B", definition: "d", importance: "core", sourceRefs: [ref] },
      ],
    });
    const rels = new Map([["doc-1", [{ source: "c-1", target: "c-2", type: "supports" as const, weight: 0.8 }]]]);
    const edges = generateEdges([doc], rels);
    expect(edges).toContainEqual({ source: "c-1", target: "c-2", type: "supports", weight: 0.8 });
  });

  it("deduplicates edges with same source, target, and type", () => {
    const doc = makeDoc({
      concepts: [
        { id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] },
        { id: "c-2", name: "B", definition: "d", importance: "core", sourceRefs: [ref] },
        ],
        arguments: [
          { id: "a-1", claim: "claim", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] },
          { id: "a-2", claim: "sup", type: "supporting", evidence: [], assumptions: [], gaps: [], sourceRefs: [{ ...ref, startLine: 2 }] },
        ],
      });
    // Concept relationship duplicates the structural supports edge
    const rels = new Map([["doc-1", [{ source: "a-2", target: "a-1", type: "supports" as const }]]]);
    const edges = generateEdges([doc], rels);
    const supEdges = edges.filter((e) => e.source === "a-2" && e.target === "a-1" && e.type === "supports");
    expect(supEdges).toHaveLength(1);
  });
});
