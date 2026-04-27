import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadDashboardData } from "./load-dashboard-data";

const fixtureRoot = resolve(process.cwd(), "tests/fixtures/dashboard-workspace");

describe("loadDashboardData", () => {
  it("returns the ready dashboard payload when graph and markdown artifacts exist", async () => {
    const read = (path: string) => readFile(resolve(fixtureRoot, path), "utf-8");

    await expect(loadDashboardData(read)).resolves.toMatchObject({
      state: "ready",
      graph: {
        version: "1.0.0",
        documents: [
          {
            id: "doc-1",
            title: "Document One",
          },
        ],
      },
      documents: [
        {
          id: "doc-1",
          title: "Document One",
          simplified: {
            layeredSummary: expect.stringContaining("# Document One"),
            conceptGlossary: expect.stringContaining("# Concept Glossary: Document One"),
            argumentMap: expect.stringContaining("# Argument Map: Document One"),
            comprehensionCheck: expect.stringContaining("# Comprehension Check: Document One"),
          },
        },
      ],
    });
  });

  it("returns the empty state when the knowledge graph artifact is missing", async () => {
    const read = async (path: string) => {
      throw new Error(`ENOENT: ${path}`);
    };

    await expect(loadDashboardData(read)).resolves.toEqual({
      state: "empty",
    });
  });

  it("returns the malformed state when the knowledge graph cannot be parsed", async () => {
    const read = async (path: string) => {
      if (path === ".text-comprehend/knowledge-graph.json") {
        return "{not valid json";
      }

      throw new Error(`ENOENT: ${path}`);
    };

    await expect(loadDashboardData(read)).resolves.toMatchObject({
      state: "malformed",
      path: ".text-comprehend/knowledge-graph.json",
    });
  });

  it("returns a deterministic simplified artifact path when a document markdown file is missing", async () => {
    const read = async (path: string) => {
      if (path === ".text-comprehend/knowledge-graph.json") {
        return JSON.stringify({
          version: "1.0.0",
          generatedAt: "2026-04-28T00:00:00.000Z",
          documents: [
            {
              id: "doc-1",
              filePath: "docs/doc-1.md",
              title: "Document One",
              fileType: "md",
              lastAnalyzed: "2026-04-28T00:00:00.000Z",
              fileHash: "hash-doc-1",
              summary: {
                thesis: "Thesis",
                overview: "Overview",
                sections: [],
              },
              concepts: [],
              arguments: [],
              questions: [],
            },
          ],
          edges: [],
        });
      }

      if (path === ".text-comprehend/simplified/doc-1/layered-summary.md") {
        throw new Error("layered summary is missing on disk");
      }

      return "placeholder";
    };

    await expect(loadDashboardData(read)).resolves.toMatchObject({
      state: "malformed",
      path: ".text-comprehend/simplified/doc-1/layered-summary.md",
    });
  });

  it("reports the first simplified artifact path in loader order when multiple reads fail", async () => {
    const read = async (path: string) => {
      if (path === ".text-comprehend/knowledge-graph.json") {
        return JSON.stringify({
          version: "1.0.0",
          generatedAt: "2026-04-28T00:00:00.000Z",
          documents: [
            {
              id: "doc-1",
              filePath: "docs/doc-1.md",
              title: "Document One",
              fileType: "md",
              lastAnalyzed: "2026-04-28T00:00:00.000Z",
              fileHash: "hash-doc-1",
              summary: {
                thesis: "Thesis",
                overview: "Overview",
                sections: [],
              },
              concepts: [],
              arguments: [],
              questions: [],
            },
          ],
          edges: [],
        });
      }

      if (path === ".text-comprehend/simplified/doc-1/layered-summary.md") {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("layered summary is missing on disk");
      }

      if (path === ".text-comprehend/simplified/doc-1/concept-glossary.md") {
        throw new Error("glossary is missing on disk");
      }

      return "placeholder";
    };

    await expect(loadDashboardData(read)).resolves.toMatchObject({
      state: "malformed",
      path: ".text-comprehend/simplified/doc-1/layered-summary.md",
    });
  });

  it("reports the first document artifact path in graph order when multiple documents fail", async () => {
    const read = async (path: string) => {
      if (path === ".text-comprehend/knowledge-graph.json") {
        return JSON.stringify({
          version: "1.0.0",
          generatedAt: "2026-04-28T00:00:00.000Z",
          documents: [
            {
              id: "doc-1",
              filePath: "docs/doc-1.md",
              title: "Document One",
              fileType: "md",
              lastAnalyzed: "2026-04-28T00:00:00.000Z",
              fileHash: "hash-doc-1",
              summary: {
                thesis: "Thesis",
                overview: "Overview",
                sections: [],
              },
              concepts: [],
              arguments: [],
              questions: [],
            },
            {
              id: "doc-2",
              filePath: "docs/doc-2.md",
              title: "Document Two",
              fileType: "md",
              lastAnalyzed: "2026-04-28T00:00:00.000Z",
              fileHash: "hash-doc-2",
              summary: {
                thesis: "Thesis",
                overview: "Overview",
                sections: [],
              },
              concepts: [],
              arguments: [],
              questions: [],
            },
          ],
          edges: [],
        });
      }

      if (path === ".text-comprehend/simplified/doc-1/layered-summary.md") {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("doc-1 summary is missing on disk");
      }

      if (path === ".text-comprehend/simplified/doc-2/layered-summary.md") {
        throw new Error("doc-2 summary is missing on disk");
      }

      return "placeholder";
    };

    await expect(loadDashboardData(read)).resolves.toMatchObject({
      state: "malformed",
      path: ".text-comprehend/simplified/doc-1/layered-summary.md",
    });
  });
});
