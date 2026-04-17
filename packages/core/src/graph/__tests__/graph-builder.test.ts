import { describe, it, expect } from "vitest";
import { buildKnowledgeGraph } from "../graph-builder.js";
import { join } from "node:path";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function setupFixture() {
  const root = join(tmpdir(), `tc-test-${randomUUID()}`);
  const tcDir = join(root, ".text-comprehend");
  await mkdir(tcDir, { recursive: true });

  // Write manifest
  const manifest = {
    version: "1.0.0",
    lastRun: "2025-01-01T00:00:00.000Z",
    files: {
      "doc.md": {
        documentId: "doc-1",
        fileHash: "hash1",
        lastAnalyzed: "2025-01-01T00:00:00.000Z",
        facets: {
          summary: { status: "success" },
          concepts: { status: "success" },
          arguments: { status: "success" },
          qa: { status: "success" },
        },
      },
    },
  };
  await writeFile(join(tcDir, "manifest.json"), JSON.stringify(manifest));

  const ref = { documentId: "doc-1", startLine: 0, endLine: 1, excerpt: "x" };

  // Write facet files
  const facetsDir = join(tcDir, "facets");
  await mkdir(join(facetsDir, "summary"), { recursive: true });
  await mkdir(join(facetsDir, "concepts"), { recursive: true });
  await mkdir(join(facetsDir, "arguments"), { recursive: true });
  await mkdir(join(facetsDir, "qa"), { recursive: true });

  await writeFile(
    join(facetsDir, "summary", "doc-1.json"),
    JSON.stringify({
      documentId: "doc-1",
      summary: {
        thesis: "Test thesis",
        overview: "Test overview",
        sections: [{ id: "sec-1", heading: "H1", summary: "S", keyPoints: ["k"], sourceRange: ref }],
      },
    }),
  );

  await writeFile(
    join(facetsDir, "concepts", "doc-1.json"),
    JSON.stringify({
      documentId: "doc-1",
      concepts: [{ id: "c-1", name: "TestConcept", definition: "def", importance: "core", sourceRefs: [ref] }],
      relationships: [{ source: "c-1", target: "c-1", type: "defines" }],
    }),
  );

  await writeFile(
    join(facetsDir, "arguments", "doc-1.json"),
    JSON.stringify({
      documentId: "doc-1",
      arguments: [{ id: "a-1", claim: "claim", type: "main", evidence: [], assumptions: [], gaps: [], sourceRefs: [ref] }],
    }),
  );

  await writeFile(
    join(facetsDir, "qa", "doc-1.json"),
    JSON.stringify({
      documentId: "doc-1",
      questions: [{ id: "q-1", question: "?", answer: "a", difficulty: "basic", facet: "factual", sourceRefs: [ref] }],
    }),
  );

  return root;
}

describe("buildKnowledgeGraph", () => {
  it("builds a valid KnowledgeGraph from facet files", async () => {
    const root = await setupFixture();
    const kg = await buildKnowledgeGraph(root);

    expect(kg.version).toBe("1.0.0");
    expect(kg.documents).toHaveLength(1);
    expect(kg.documents[0].id).toBe("doc-1");
    expect(kg.documents[0].summary.thesis).toBe("Test thesis");
    expect(kg.documents[0].concepts).toHaveLength(1);
    expect(kg.documents[0].arguments).toHaveLength(1);
    expect(kg.documents[0].questions).toHaveLength(1);
    expect(kg.edges.length).toBeGreaterThan(0);
    // Should have contains edges
    expect(kg.edges.filter((e) => e.type === "contains")).toHaveLength(4); // sec, concept, arg, question
  });

  it("handles missing facets gracefully", async () => {
    const root = join(tmpdir(), `tc-test-${randomUUID()}`);
    const tcDir = join(root, ".text-comprehend");
    await mkdir(tcDir, { recursive: true });

    const manifest = {
      version: "1.0.0",
      lastRun: "2025-01-01T00:00:00.000Z",
      files: {
        "doc.md": {
          documentId: "doc-2",
          fileHash: "h2",
          lastAnalyzed: "2025-01-01T00:00:00.000Z",
          facets: {
            summary: { status: "success" },
            concepts: { status: "failed", error: "err" },
            arguments: { status: "pending" },
            qa: { status: "pending" },
          },
        },
      },
    };
    await writeFile(join(tcDir, "manifest.json"), JSON.stringify(manifest));

    // Only summary facet exists (but no file on disk either - will fail validation)
    const kg = await buildKnowledgeGraph(root);
    expect(kg.documents).toHaveLength(1);
    expect(kg.documents[0].summary.thesis).toBe("Summary unavailable");
    expect(kg.documents[0].concepts).toEqual([]);
    expect(kg.documents[0].arguments).toEqual([]);
    expect(kg.documents[0].questions).toEqual([]);
  });

  it("builds a multi-document graph and writes knowledge-graph.json to disk", async () => {
    const root = join(tmpdir(), `tc-test-${randomUUID()}`);
    const tcDir = join(root, ".text-comprehend");
    await mkdir(tcDir, { recursive: true });

    const ref1 = { documentId: "doc-a", startLine: 0, endLine: 1, excerpt: "x" };
    const ref2 = { documentId: "doc-b", startLine: 0, endLine: 1, excerpt: "y" };

    const manifest = {
      version: "1.0.0",
      lastRun: "2025-01-01T00:00:00.000Z",
      files: {
        "a.md": {
          documentId: "doc-a",
          fileHash: "ha",
          lastAnalyzed: "2025-01-01T00:00:00.000Z",
          facets: { summary: { status: "success" }, concepts: { status: "success" }, arguments: { status: "success" }, qa: { status: "success" } },
        },
        "b.md": {
          documentId: "doc-b",
          fileHash: "hb",
          lastAnalyzed: "2025-01-01T00:00:00.000Z",
          facets: { summary: { status: "success" }, concepts: { status: "success" }, arguments: { status: "success" }, qa: { status: "success" } },
        },
      },
    };
    await writeFile(join(tcDir, "manifest.json"), JSON.stringify(manifest));

    const facetsDir = join(tcDir, "facets");
    for (const ft of ["summary", "concepts", "arguments", "qa"]) {
      await mkdir(join(facetsDir, ft), { recursive: true });
    }

    for (const [docId, ref] of [["doc-a", ref1], ["doc-b", ref2]] as const) {
      await writeFile(join(facetsDir, "summary", `${docId}.json`), JSON.stringify({
        documentId: docId,
        summary: { thesis: `Thesis ${docId}`, overview: "Overview", sections: [{ id: `sec-${docId}`, heading: "H", summary: "S", keyPoints: ["k"], sourceRange: ref }] },
      }));
      await writeFile(join(facetsDir, "concepts", `${docId}.json`), JSON.stringify({
        documentId: docId,
        concepts: [{ id: `c-${docId}`, name: "SharedConcept", definition: "def", importance: "core", sourceRefs: [ref] }],
        relationships: [],
      }));
      await writeFile(join(facetsDir, "arguments", `${docId}.json`), JSON.stringify({ documentId: docId, arguments: [] }));
      await writeFile(join(facetsDir, "qa", `${docId}.json`), JSON.stringify({ documentId: docId, questions: [] }));
    }

    const kg = await buildKnowledgeGraph(root);

    expect(kg.documents).toHaveLength(2);
    expect(kg.edges.length).toBeGreaterThan(0);

    // Verify file was written to disk
    const kgPath = join(root, ".text-comprehend", "knowledge-graph.json");
    const raw = await readFile(kgPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.documents).toHaveLength(2);
    expect(parsed.version).toBe("1.0.0");
  });
});
