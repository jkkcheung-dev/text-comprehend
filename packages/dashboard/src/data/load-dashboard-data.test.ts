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
});
