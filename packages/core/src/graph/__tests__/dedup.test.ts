import { describe, it, expect } from "vitest";
import { findOrphans } from "../dedup.js";
import type { DocumentNode, Edge } from "../../schemas/index.js";

const ref = { documentId: "doc-1", startLine: 1, endLine: 1, excerpt: "x" };

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
