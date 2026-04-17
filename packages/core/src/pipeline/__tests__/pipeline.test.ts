import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir, readFile, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runPipeline } from "../pipeline.js";
import { loadFacetOutput } from "../facet-persistence.js";
import type { AgentExecutor } from "../types.js";

// Helper to create a valid mock response for each facet type
function mockResponse(facetType: string, documentId: string): string {
  switch (facetType) {
    case "summary":
      return JSON.stringify({
        documentId,
        summary: {
          thesis: "Test thesis",
          overview: "Test overview paragraph.",
          sections: [
            {
              id: "sec-1",
              heading: "Introduction",
              summary: "Intro summary",
              keyPoints: ["point1", "point2"],
              sourceRange: { documentId, startLine: 1, endLine: 5, excerpt: "excerpt" },
            },
          ],
        },
      });
    case "concepts":
      return JSON.stringify({
        documentId,
        concepts: [
          {
            id: "concept-1",
            name: "Test Concept",
            definition: "A test concept",
            importance: "core",
            sourceRefs: [{ documentId, startLine: 1, endLine: 2, excerpt: "test" }],
          },
        ],
        relationships: [],
      });
    case "arguments":
      return JSON.stringify({
        documentId,
        arguments: [],
      });
    case "qa":
      return JSON.stringify({
        documentId,
        questions: [
          {
            id: "q-1",
            question: "What is this?",
            answer: "A test.",
            difficulty: "basic",
            facet: "factual",
            sourceRefs: [{ documentId, startLine: 1, endLine: 1, excerpt: "test" }],
          },
        ],
      });
    default:
      return "{}";
  }
}

function createMockExecutor(): AgentExecutor {
  return async (prompt: string) => {
    // Detect facet type from prompt content
    if (prompt.includes("summarization specialist")) {
      const docIdMatch = prompt.match(/Document ID: (\S+)/);
      return "```json\n" + mockResponse("summary", docIdMatch?.[1] ?? "unknown") + "\n```";
    }
    if (prompt.includes("concept extraction specialist")) {
      const docIdMatch = prompt.match(/Document ID: (\S+)/);
      return "```json\n" + mockResponse("concepts", docIdMatch?.[1] ?? "unknown") + "\n```";
    }
    if (prompt.includes("argument analysis specialist")) {
      const docIdMatch = prompt.match(/Document ID: (\S+)/);
      return "```json\n" + mockResponse("arguments", docIdMatch?.[1] ?? "unknown") + "\n```";
    }
    if (prompt.includes("comprehension assessment specialist")) {
      const docIdMatch = prompt.match(/Document ID: (\S+)/);
      return "```json\n" + mockResponse("qa", docIdMatch?.[1] ?? "unknown") + "\n```";
    }
    return "{}";
  };
}

describe("pipeline", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "tc-pipeline-"));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  async function createTestFile(name: string, content: string): Promise<void> {
    await writeFile(join(rootDir, name), content, "utf-8");
  }

  it("processes a single document with all 4 facets succeeding", async () => {
    await createTestFile("test-doc.md", "# Test Document\n\nThis is test content for analysis.");

    const result = await runPipeline({
      rootDir,
      agentExecutor: createMockExecutor(),
    });

    expect(result.documentsProcessed).toBe(1);
    expect(result.facetsSucceeded).toBe(4);
    expect(result.facetsFailed).toBe(0);
    expect(result.results).toHaveLength(1);

    const docResult = result.results[0];
    expect(docResult.facets.summary.success).toBe(true);
    expect(docResult.facets.concepts.success).toBe(true);
    expect(docResult.facets.arguments.success).toBe(true);
    expect(docResult.facets.qa.success).toBe(true);
  });

  it("batches documents correctly with >5 docs", async () => {
    // Create 7 docs
    for (let i = 0; i < 7; i++) {
      await createTestFile(`doc-${i}.md`, `# Document ${i}\n\nContent for document ${i}.`);
    }

    let callCount = 0;
    const executor: AgentExecutor = async (prompt) => {
      callCount++;
      return createMockExecutor()(prompt);
    };

    const result = await runPipeline({
      rootDir,
      batchSize: 5,
      agentExecutor: executor,
    });

    expect(result.documentsProcessed).toBe(7);
    // 7 docs * 4 facets = 28 calls
    expect(callCount).toBe(28);
    expect(result.facetsSucceeded).toBe(28);
  });

  it("handles individual agent failures without blocking others", async () => {
    await createTestFile("test-doc.md", "# Test\n\nContent here.");

    const executor: AgentExecutor = async (prompt) => {
      if (prompt.includes("summarization specialist")) {
        throw new Error("LLM API timeout");
      }
      return createMockExecutor()(prompt);
    };

    const result = await runPipeline({ rootDir, agentExecutor: executor });

    expect(result.documentsProcessed).toBe(1);
    expect(result.facetsSucceeded).toBe(3);
    expect(result.facetsFailed).toBe(1);

    const docResult = result.results[0];
    expect(docResult.facets.summary.success).toBe(false);
    expect(docResult.facets.summary.error).toContain("LLM API timeout");
    expect(docResult.facets.concepts.success).toBe(true);
    expect(docResult.facets.arguments.success).toBe(true);
    expect(docResult.facets.qa.success).toBe(true);

    // Verify manifest records the failure
    const manifestRaw = await readFile(join(rootDir, ".text-comprehend", "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    const fileEntry = Object.values(manifest.files)[0] as any;
    expect(fileEntry.facets.summary.status).toBe("failed");
    expect(fileEntry.facets.summary.error).toContain("LLM API timeout");
    expect(fileEntry.facets.concepts.status).toBe("success");
  });

  it("skips unchanged files on second run (incremental updates)", async () => {
    await createTestFile("test-doc.md", "# Test\n\nContent.");

    // First run
    await runPipeline({ rootDir, agentExecutor: createMockExecutor() });

    // Second run - same content
    let callCount = 0;
    const executor: AgentExecutor = async (prompt) => {
      callCount++;
      return createMockExecutor()(prompt);
    };

    const result = await runPipeline({ rootDir, agentExecutor: executor });

    expect(callCount).toBe(0);
    expect(result.documentsProcessed).toBe(0);
    expect(result.documentsSkipped).toBe(1);
  });

  it("retryFailed re-processes only failed facets", async () => {
    await createTestFile("test-doc.md", "# Test\n\nContent here.");

    // First run with summary failing
    let failSummary = true;
    const executor: AgentExecutor = async (prompt) => {
      if (failSummary && prompt.includes("summarization specialist")) {
        throw new Error("timeout");
      }
      return createMockExecutor()(prompt);
    };

    await runPipeline({ rootDir, agentExecutor: executor });

    // Second run with retryFailed - now summary works
    failSummary = false;
    let calledFacets: string[] = [];
    const retryExecutor: AgentExecutor = async (prompt) => {
      if (prompt.includes("summarization specialist")) calledFacets.push("summary");
      if (prompt.includes("concept extraction specialist")) calledFacets.push("concepts");
      if (prompt.includes("argument analysis specialist")) calledFacets.push("arguments");
      if (prompt.includes("comprehension assessment specialist")) calledFacets.push("qa");
      return createMockExecutor()(prompt);
    };

    const result = await runPipeline({
      rootDir,
      retryFailed: true,
      agentExecutor: retryExecutor,
    });

    // Only the failed summary facet should have been retried
    expect(calledFacets).toEqual(["summary"]);
    expect(result.documentsProcessed).toBe(1);
    expect(result.facetsSucceeded).toBe(1);
    expect(result.facetsFailed).toBe(0);

    // Verify manifest now shows all success
    const manifestRaw = await readFile(join(rootDir, ".text-comprehend", "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    const fileEntry = Object.values(manifest.files)[0] as any;
    expect(fileEntry.facets.summary.status).toBe("success");
    expect(fileEntry.facets.concepts.status).toBe("success");
  });

  it("persists facet outputs to disk", async () => {
    await createTestFile("test-doc.md", "# Test\n\nContent.");

    const result = await runPipeline({ rootDir, agentExecutor: createMockExecutor() });
    const docId = result.results[0].documentId;
    const summaryData = await loadFacetOutput(rootDir, "summary", docId);
    expect(summaryData).not.toBeNull();
    expect((summaryData as any).documentId).toBeDefined();
  });

  it("removes manifest entry and facet files when a file is deleted", async () => {
    await createTestFile("to-delete.md", "# Will be deleted\n\nContent.");

    // First run
    const result1 = await runPipeline({ rootDir, agentExecutor: createMockExecutor() });
    expect(result1.documentsProcessed).toBe(1);
    const docId = result1.results[0].documentId;

    // Verify facet files exist
    const summaryData = await loadFacetOutput(rootDir, "summary", docId);
    expect(summaryData).not.toBeNull();

    // Delete the source file
    await unlink(join(rootDir, "to-delete.md"));

    // Second run
    const result2 = await runPipeline({ rootDir, agentExecutor: createMockExecutor() });

    // Manifest should no longer have the entry
    const manifestRaw = await readFile(join(rootDir, ".text-comprehend", "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(Object.keys(manifest.files)).toHaveLength(0);

    // Facet files should be gone
    const summaryAfter = await loadFacetOutput(rootDir, "summary", docId);
    expect(summaryAfter).toBeNull();
  });
});
