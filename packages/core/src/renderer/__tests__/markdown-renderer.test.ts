import { describe, it, expect } from "vitest";
import { renderMarkdownOutput, renderSingleDocument } from "../markdown-renderer.js";
import { join } from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { KnowledgeGraph } from "../../schemas/index.js";

const ref = { documentId: "doc-1", startLine: 1, endLine: 10, excerpt: "test" };

function makeGraph(overrides?: Partial<KnowledgeGraph["documents"][0]>): KnowledgeGraph {
  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    documents: [
      {
        id: "doc-1",
        filePath: "test.md",
        title: "Test Document",
        fileType: "md",
        lastAnalyzed: new Date().toISOString(),
        fileHash: "abc123",
        summary: {
          thesis: "Main thesis statement",
          overview: "An overview of the document",
          sections: [
            {
              id: "sec-1",
              heading: "Introduction",
              summary: "Intro summary",
              keyPoints: ["Point A", "Point B"],
              sourceRange: ref,
            },
          ],
        },
        concepts: [
          { id: "c-1", name: "Concept One", definition: "Def one", importance: "core", sourceRefs: [ref] },
          { id: "c-2", name: "Concept Two", definition: "Def two", importance: "supporting", sourceRefs: [ref] },
          { id: "c-3", name: "Concept Three", definition: "Def three", importance: "peripheral", sourceRefs: [ref] },
        ],
        arguments: [
          {
            id: "a-1",
            claim: "Main claim",
            type: "main",
            evidence: [
              { content: "Evidence text", type: "data", strength: "strong", sourceRef: ref },
            ],
            assumptions: ["Assumption 1"],
            gaps: ["Gap 1"],
            sourceRefs: [ref],
          },
          {
            id: "a-2",
            claim: "Counter claim",
            type: "counter",
            evidence: [],
            assumptions: [],
            gaps: [],
            sourceRefs: [ref],
          },
        ],
        questions: [
          { id: "q-1", question: "What is X?", answer: "X is Y", difficulty: "basic", facet: "factual", sourceRefs: [ref] },
          { id: "q-2", question: "Why does X matter?", answer: "Because Z", difficulty: "advanced", facet: "evaluative", sourceRefs: [ref] },
        ],
        ...overrides,
      },
    ],
    edges: [],
  };
}

async function setupRoot(graph: KnowledgeGraph): Promise<string> {
  const root = join(tmpdir(), `tc-render-${randomUUID()}`);
  const tcDir = join(root, ".text-comprehend");
  await mkdir(tcDir, { recursive: true });
  await writeFile(join(tcDir, "knowledge-graph.json"), JSON.stringify(graph));
  return root;
}

describe("markdown-renderer", () => {
  it("generates all 4 files per document", async () => {
    const root = await setupRoot(makeGraph());
    await renderMarkdownOutput(root);

    const dir = join(root, ".text-comprehend", "simplified", "doc-1");
    const files = ["layered-summary.md", "concept-glossary.md", "argument-map.md", "comprehension-check.md"];
    for (const f of files) {
      const content = await readFile(join(dir, f), "utf-8");
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("layered-summary.md has correct format", async () => {
    const root = await setupRoot(makeGraph());
    await renderMarkdownOutput(root);

    const content = await readFile(join(root, ".text-comprehend", "simplified", "doc-1", "layered-summary.md"), "utf-8");
    expect(content).toContain("# Test Document");
    expect(content).toContain("> Source: `test.md`");
    expect(content).toContain("## Thesis");
    expect(content).toContain("Main thesis statement");
    expect(content).toContain("## Overview");
    expect(content).toContain("### Introduction");
    expect(content).toContain("- Point A");
    expect(content).toContain("- Point B");
    expect(content).toContain("*Source: lines 1-10*");
  });

  it("concept-glossary.md groups by importance", async () => {
    const root = await setupRoot(makeGraph());
    await renderMarkdownOutput(root);

    const content = await readFile(join(root, ".text-comprehend", "simplified", "doc-1", "concept-glossary.md"), "utf-8");
    expect(content).toContain("# Concept Glossary: Test Document");
    expect(content).toContain("## Core Concepts");
    expect(content).toContain("### Concept One");
    expect(content).toContain("## Supporting Concepts");
    expect(content).toContain("### Concept Two");
    expect(content).toContain("## Peripheral Concepts");
    expect(content).toContain("### Concept Three");
    expect(content).toContain("- **Importance:** core");
  });

  it("argument-map.md has claims and evidence", async () => {
    const root = await setupRoot(makeGraph());
    await renderMarkdownOutput(root);

    const content = await readFile(join(root, ".text-comprehend", "simplified", "doc-1", "argument-map.md"), "utf-8");
    expect(content).toContain("# Argument Map: Test Document");
    expect(content).toContain("## Main Claims");
    expect(content).toContain("### Claim: Main claim");
    expect(content).toContain("[data, strong] Evidence text");
    expect(content).toContain("- Assumption 1");
    expect(content).toContain("- Gap 1");
    expect(content).toContain("## Counter Claims");
    expect(content).toContain("### Claim: Counter claim");
  });

  it("comprehension-check.md has Q&A with details", async () => {
    const root = await setupRoot(makeGraph());
    await renderMarkdownOutput(root);

    const content = await readFile(join(root, ".text-comprehend", "simplified", "doc-1", "comprehension-check.md"), "utf-8");
    expect(content).toContain("# Comprehension Check: Test Document");
    expect(content).toContain("## Basic Questions");
    expect(content).toContain("### Q: What is X? *(factual)*");
    expect(content).toContain("<details>");
    expect(content).toContain("<summary>Show Answer</summary>");
    expect(content).toContain("X is Y");
    expect(content).toContain("## Advanced Questions");
  });

  it("renderSingleDocument only renders one doc", async () => {
    const graph = makeGraph();
    graph.documents.push({
      ...graph.documents[0],
      id: "doc-2",
      title: "Second Doc",
    });
    const root = await setupRoot(graph);
    await renderSingleDocument(root, "doc-1");

    const content = await readFile(join(root, ".text-comprehend", "simplified", "doc-1", "layered-summary.md"), "utf-8");
    expect(content).toContain("# Test Document");

    // doc-2 should not exist
    await expect(
      readFile(join(root, ".text-comprehend", "simplified", "doc-2", "layered-summary.md"), "utf-8"),
    ).rejects.toThrow();
  });

  it("renderSingleDocument throws for unknown doc", async () => {
    const root = await setupRoot(makeGraph());
    await expect(renderSingleDocument(root, "nonexistent")).rejects.toThrow("Document not found: nonexistent");
  });

  it("handles empty concepts, arguments, and questions", async () => {
    const root = await setupRoot(makeGraph({ concepts: [], arguments: [], questions: [] }));
    await renderMarkdownOutput(root);

    const dir = join(root, ".text-comprehend", "simplified", "doc-1");

    const glossary = await readFile(join(dir, "concept-glossary.md"), "utf-8");
    expect(glossary).toContain("# Concept Glossary:");
    expect(glossary).not.toContain("## Core Concepts");

    const argMap = await readFile(join(dir, "argument-map.md"), "utf-8");
    expect(argMap).toContain("# Argument Map:");
    expect(argMap).not.toContain("## Main Claims");

    const check = await readFile(join(dir, "comprehension-check.md"), "utf-8");
    expect(check).toContain("# Comprehension Check:");
    expect(check).not.toContain("## Basic Questions");
  });
});
