import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadDashboardData } from "./load-dashboard-data";

const fixtureRootUrl = new URL("../../../../tests/fixtures/dashboard-workspace/", import.meta.url);
const fixtureMeta = {
  mode: "fixture" as const,
  label: "Fixture: dashboard-workspace",
  fixtureName: "dashboard-workspace",
};

const fixtureSource = {
  meta: fixtureMeta,
  read: (path: string) => readFile(fileURLToPath(new URL(path, fixtureRootUrl)), "utf-8"),
};

function createGraph(documentIds: string[]) {
  return JSON.stringify({
    version: "1.0.0",
    generatedAt: "2026-04-28T00:00:00.000Z",
    documents: documentIds.map((documentId, index) => ({
      id: documentId,
      filePath: `docs/${documentId}.md`,
      title: `Document ${index + 1}`,
      fileType: "md",
      lastAnalyzed: "2026-04-28T00:00:00.000Z",
      fileHash: `hash-${documentId}`,
      summary: {
        thesis: "Thesis",
        overview: "Overview",
        sections: [],
      },
      concepts: [],
      arguments: [],
      questions: [],
    })),
    edges: [],
  });
}

describe("loadDashboardData", () => {
  it("returns ready data with available document detail when graph and markdown artifacts exist", async () => {
    await expect(loadDashboardData(fixtureSource)).resolves.toMatchObject({
      state: "ready",
      source: fixtureMeta,
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
          detail: {
            state: "available",
            simplified: {
              layeredSummary: expect.stringContaining("# Document One"),
              conceptGlossary: expect.stringContaining("# Concept Glossary: Document One"),
              argumentMap: expect.stringContaining("# Argument Map: Document One"),
              comprehensionCheck: expect.stringContaining("# Comprehension Check: Document One"),
            },
          },
        },
      ],
    });
  });

  it("returns empty when the knowledge graph artifact is missing", async () => {
    const source = {
      meta: fixtureMeta,
      read: async (path: string) => {
        throw new Error(`ENOENT: ${path}`);
      },
    };

    await expect(loadDashboardData(source)).resolves.toEqual({
      state: "empty",
      source: fixtureMeta,
    });
  });

  it("returns malformed when the knowledge graph cannot be parsed", async () => {
    const source = {
      meta: fixtureMeta,
      read: async (path: string) => {
        if (path === ".text-comprehend/knowledge-graph.json") {
          return "{not valid json";
        }

        throw new Error(`ENOENT: ${path}`);
      },
    };

    await expect(loadDashboardData(source)).resolves.toMatchObject({
      state: "malformed",
      source: fixtureMeta,
      path: ".text-comprehend/knowledge-graph.json",
    });
  });

  it("keeps the dashboard ready when one simplified artifact is missing", async () => {
    const source = {
      meta: fixtureMeta,
      read: async (path: string) => {
        if (path === ".text-comprehend/knowledge-graph.json") {
          return createGraph(["doc-1"]);
        }

        if (path === ".text-comprehend/simplified/doc-1/layered-summary.md") {
          throw new Error("layered summary is missing on disk");
        }

        return "placeholder";
      },
    };

    await expect(loadDashboardData(source)).resolves.toMatchObject({
      state: "ready",
      source: fixtureMeta,
      documents: [
        {
          id: "doc-1",
          detail: {
            state: "degraded",
            path: ".text-comprehend/simplified/doc-1/layered-summary.md",
            error: "layered summary is missing on disk",
          },
        },
      ],
    });
  });

  it("preserves simplified markdown when all detail artifacts exist", async () => {
    const source = {
      meta: fixtureMeta,
      read: (path: string) => readFile(fileURLToPath(new URL(path, fixtureRootUrl)), "utf-8"),
    };

    await expect(loadDashboardData(source)).resolves.toMatchObject({
      state: "ready",
      documents: [
        {
          id: "doc-1",
          detail: {
            state: "available",
            simplified: {
              layeredSummary: expect.stringContaining("# Document One"),
            },
          },
        },
      ],
    });
  });

  it("reports degraded paths deterministically from loader order and preserves graph order", async () => {
    const source = {
      meta: fixtureMeta,
      read: async (path: string) => {
        if (path === ".text-comprehend/knowledge-graph.json") {
          return createGraph(["doc-1", "doc-2"]);
        }

        if (path === ".text-comprehend/simplified/doc-1/layered-summary.md") {
          throw {
            state: "malformed",
            path: ".text-comprehend/simplified/doc-1/concept-glossary.md",
            error: "upstream path should not override loader path",
          };
        }

        if (path === ".text-comprehend/simplified/doc-2/layered-summary.md") {
          throw new Error("doc-2 summary is missing on disk");
        }

        return "placeholder";
      },
    };

    await expect(loadDashboardData(source)).resolves.toMatchObject({
      state: "ready",
      source: fixtureMeta,
      documents: [
        {
          id: "doc-1",
          detail: {
            state: "degraded",
            path: ".text-comprehend/simplified/doc-1/layered-summary.md",
          },
        },
        {
          id: "doc-2",
          detail: {
            state: "degraded",
            path: ".text-comprehend/simplified/doc-2/layered-summary.md",
          },
        },
      ],
    });
  });

  it("keeps a deterministic string error when wrapped detail failures have no second line", async () => {
    const source = {
      meta: fixtureMeta,
      read: async (path: string) => {
        if (path === ".text-comprehend/knowledge-graph.json") {
          return createGraph(["doc-1"]);
        }

        if (path === ".text-comprehend/simplified/doc-1/layered-summary.md") {
          throw { message: ".text-comprehend/simplified/doc-1/layered-summary.md" };
        }

        return "placeholder";
      },
    };

    await expect(loadDashboardData(source)).resolves.toMatchObject({
      state: "ready",
      source: fixtureMeta,
      documents: [
        {
          id: "doc-1",
          detail: {
            state: "degraded",
            path: ".text-comprehend/simplified/doc-1/layered-summary.md",
            error: ".text-comprehend/simplified/doc-1/layered-summary.md",
          },
        },
      ],
    });
  });
});
