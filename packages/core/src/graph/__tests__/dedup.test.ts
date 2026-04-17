import { describe, it, expect } from "vitest";
import { deduplicateConcepts, findOrphans } from "../dedup.js";
import type { DocumentNode, Edge } from "../../schemas/index.js";

const ref = { documentId: "doc-1", startLine: 0, endLine: 1, excerpt: "x" };

function makeDoc(overrides: Partial<DocumentNode> & { id: string }): DocumentNode {
  return {
    filePath: "test.md",
    title: "Test",
    fileType: "md",
    lastAnalyzed: "2025-01-01T00:00:00.000Z",
    fileHash: "abc",
    summary: { thesis: "t", overview: "o", sections: [] },
    concepts: [],
    arguments: [],
    questions: [],
    ...overrides,
  };
}

describe("deduplicateConcepts", () => {
  it("merges same-name concepts keeping highest importance", () => {
    const docs = [
      makeDoc({
        id: "d1",
        concepts: [{ id: "c-1", name: "Machine Learning", definition: "d1", importance: "peripheral", sourceRefs: [ref] }],
      }),
      makeDoc({
        id: "d2",
        concepts: [{ id: "c-2", name: "machine learning", definition: "d2", importance: "core", sourceRefs: [ref] }],
      }),
    ];

    const { documents, idMap } = deduplicateConcepts(docs);
    // c-2 is canonical (core > peripheral), so c-1 should be mapped to c-2
    expect(idMap.get("c-1")).toBe("c-2");
    // d1 should have its concept removed
    expect(documents[0].concepts).toHaveLength(0);
    // d2 keeps its concept
    expect(documents[1].concepts).toHaveLength(1);
  });

  it("does not deduplicate different names", () => {
    const docs = [
      makeDoc({
        id: "d1",
        concepts: [{ id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] }],
      }),
      makeDoc({
        id: "d2",
        concepts: [{ id: "c-2", name: "B", definition: "d", importance: "core", sourceRefs: [ref] }],
      }),
    ];
    const { documents, idMap } = deduplicateConcepts(docs);
    expect(idMap.size).toBe(0);
    expect(documents[0].concepts).toHaveLength(1);
    expect(documents[1].concepts).toHaveLength(1);
  });
});

describe("findOrphans", () => {
  it("returns nodes with no edges", () => {
    const docs = [
      makeDoc({
        id: "d1",
        concepts: [{ id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] }],
      }),
    ];
    const edges: Edge[] = [{ source: "d1", target: "c-1", type: "contains" }];
    expect(findOrphans(docs, edges)).toEqual([]);
  });

  it("detects orphan nodes", () => {
    const docs = [
      makeDoc({
        id: "d1",
        concepts: [
          { id: "c-1", name: "A", definition: "d", importance: "core", sourceRefs: [ref] },
          { id: "c-2", name: "B", definition: "d", importance: "core", sourceRefs: [ref] },
        ],
      }),
    ];
    const edges: Edge[] = [{ source: "d1", target: "c-1", type: "contains" }];
    expect(findOrphans(docs, edges)).toEqual(["c-2"]);
  });
});
