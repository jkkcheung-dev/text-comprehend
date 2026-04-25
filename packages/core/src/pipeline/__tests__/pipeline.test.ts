import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir, readFile, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runPipeline, runSingleFilePipeline } from "../pipeline.js";
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

    const graphRaw = await readFile(join(rootDir, ".text-comprehend", "knowledge-graph.json"), "utf-8");
    const graph = JSON.parse(graphRaw);
    expect(graph.documents).toHaveLength(1);
    expect(graph.documents[0].filePath).toBe("test-doc.md");
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

  it("triggers full re-analysis when manifest is corrupt", async () => {
    await createTestFile("test-doc.md", "# Test\n\nContent.");

    // First run - creates valid manifest
    await runPipeline({ rootDir, agentExecutor: createMockExecutor() });

    // Corrupt the manifest
    const manifestPath = join(rootDir, ".text-comprehend", "manifest.json");
    await writeFile(manifestPath, "NOT VALID JSON {{{", "utf-8");

    // Second run - should re-process all files despite them being "unchanged"
    let callCount = 0;
    const executor: AgentExecutor = async (prompt) => {
      callCount++;
      return createMockExecutor()(prompt);
    };

    const result = await runPipeline({ rootDir, agentExecutor: executor });

    // All 4 facets should be re-processed
    expect(callCount).toBe(4);
    expect(result.documentsProcessed).toBe(1);
    expect(result.facetsSucceeded).toBe(4);
  });

  it("removes manifest entry and facet files when a file is deleted", async () => {
    await createTestFile("to-delete.md", "# Will be deleted\n\nContent.");

    // First run
    const result1 = await runPipeline({ rootDir, agentExecutor: createMockExecutor() });
    expect(result1.documentsProcessed).toBe(1);
    const docId = result1.results[0].documentId;
    const simplifiedDocDir = join(rootDir, ".text-comprehend", "simplified", docId);
    const layeredSummaryPath = join(simplifiedDocDir, "layered-summary.md");

    // Verify facet files exist
    const summaryData = await loadFacetOutput(rootDir, "summary", docId);
    expect(summaryData).not.toBeNull();
    await expect(access(layeredSummaryPath)).resolves.toBeUndefined();

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

    // Simplified markdown output directory should be gone as well
    await expect(access(simplifiedDocDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("persists the first markdown heading as the document title", async () => {
    await createTestFile("heading-fallback.md", "Leading line before heading.\n\n# Preferred Heading\n\nBody text.");

    await runPipeline({ rootDir, agentExecutor: createMockExecutor() });

    const manifestRaw = await readFile(join(rootDir, ".text-comprehend", "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.files["heading-fallback.md"].title).toBe("Preferred Heading");
  });

  it("persists the first non-empty content line when no markdown heading exists", async () => {
    await createTestFile("line-fallback.md", "\n\nFirst meaningful line\n\nSecond paragraph.");

    await runPipeline({ rootDir, agentExecutor: createMockExecutor() });

    const manifestRaw = await readFile(join(rootDir, ".text-comprehend", "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.files["line-fallback.md"].title).toBe("First meaningful line");
  });

  it("persists a sanitized filename when the document has no usable heading or content title", async () => {
    await createTestFile("sanitized_file-name.md", "#\n***\n");

    await runPipeline({ rootDir, agentExecutor: createMockExecutor() });

    const manifestRaw = await readFile(join(rootDir, ".text-comprehend", "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.files["sanitized_file-name.md"].title).toBe("sanitized file name");
  });

  it("reassembles chunked summaries without keeping the first chunk overview", async () => {
    const largeContent = [
      "# Section 1",
      "alpha",
      ...Array.from({ length: 9000 }, () => "A".repeat(12)),
      "# Section 2",
      "beta",
      ...Array.from({ length: 9000 }, () => "B".repeat(12)),
    ].join("\n");
    await createTestFile("large-doc.md", largeContent);

    const executor: AgentExecutor = async (prompt) => {
      if (prompt.includes("summarization specialist")) {
        const docIdMatch = prompt.match(/Document ID: (\S+)/);
        if (prompt.includes("chunk 1/")) {
          return JSON.stringify({
            documentId: docIdMatch?.[1] ?? "unknown",
            summary: {
              thesis: "Chunk 1 thesis",
              overview: "Overview for chunk 1.",
              sections: [
                {
                  id: "sec-1",
                  heading: "Section 1",
                  summary: "Section one summary",
                  keyPoints: ["alpha"],
                  sourceRange: { documentId: docIdMatch?.[1] ?? "unknown", startLine: 1, endLine: 2, excerpt: "alpha" },
                },
              ],
            },
          });
        }

        return JSON.stringify({
          documentId: docIdMatch?.[1] ?? "unknown",
          summary: {
            thesis: "Chunk 2 thesis",
            overview: "Overview for chunk 2.",
            sections: [
              {
                id: "sec-2",
                heading: "Section 2",
                summary: "Section two summary",
                keyPoints: ["beta"],
                sourceRange: { documentId: docIdMatch?.[1] ?? "unknown", startLine: 3, endLine: 4, excerpt: "beta" },
              },
            ],
          },
        });
      }

      return createMockExecutor()(prompt);
    };

    const result = await runPipeline({ rootDir, agentExecutor: executor });
    const summary = result.results[0].facets.summary;
    const sections = (summary.data as any).summary.sections;

    expect(summary.success).toBe(true);
    expect((summary.data as any).summary.thesis).toBe("Chunk 1 thesis Chunk 2 thesis");
    expect((summary.data as any).summary.overview).toContain("Overview for chunk 1.");
    expect((summary.data as any).summary.overview).toContain("Overview for chunk 2.");
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.some((section: any) => section.heading === "Section 1")).toBe(true);
    expect(sections.some((section: any) => section.heading === "Section 2")).toBe(true);
  });

  it("keeps chunked facet items with repeated local ids by normalizing them", async () => {
    const largeContent = [
      "# Section 1",
      "alpha",
      ...Array.from({ length: 9000 }, () => "A".repeat(12)),
      "# Section 2",
      "beta",
      ...Array.from({ length: 9000 }, () => "B".repeat(12)),
    ].join("\n");
    await createTestFile("repeated-ids.md", largeContent);

    const executor: AgentExecutor = async (prompt) => {
      const docIdMatch = prompt.match(/Document ID: (\S+)/);
      const documentId = docIdMatch?.[1] ?? "unknown";
      const isFirstChunk = prompt.includes("chunk 1/");

      if (prompt.includes("summarization specialist")) {
        return JSON.stringify({
          documentId,
          summary: {
            thesis: isFirstChunk ? "Chunk A" : "Chunk B",
            overview: isFirstChunk ? "Overview A" : "Overview B",
            sections: [
              {
                id: "sec-1",
                heading: isFirstChunk ? "Section A" : "Section B",
                summary: isFirstChunk ? "Summary A" : "Summary B",
                keyPoints: [isFirstChunk ? "alpha" : "beta"],
                sourceRange: { documentId, startLine: 1, endLine: 2, excerpt: isFirstChunk ? "alpha" : "beta" },
              },
            ],
          },
        });
      }

      if (prompt.includes("concept extraction specialist")) {
        return JSON.stringify({
          documentId,
          concepts: [
            {
              id: "concept-1",
              name: isFirstChunk ? "Alpha" : "Beta",
              definition: isFirstChunk ? "Concept A" : "Concept B",
              importance: "core",
              sourceRefs: [{ documentId, startLine: 1, endLine: 2, excerpt: isFirstChunk ? "alpha" : "beta" }],
            },
          ],
          relationships: [],
        });
      }

      if (prompt.includes("argument analysis specialist")) {
        return JSON.stringify({
          documentId,
          arguments: [
            {
              id: "arg-1",
              claim: isFirstChunk ? "Claim A" : "Claim B",
              type: "main",
              evidence: [],
              assumptions: [],
              gaps: [],
              sourceRefs: [{ documentId, startLine: 1, endLine: 2, excerpt: isFirstChunk ? "alpha" : "beta" }],
            },
          ],
        });
      }

      if (prompt.includes("comprehension assessment specialist")) {
        return JSON.stringify({
          documentId,
          questions: [
            {
              id: "q-1",
              question: isFirstChunk ? "Question A?" : "Question B?",
              answer: isFirstChunk ? "Answer A" : "Answer B",
              difficulty: "basic",
              facet: "factual",
              sourceRefs: [{ documentId, startLine: 1, endLine: 2, excerpt: isFirstChunk ? "alpha" : "beta" }],
            },
          ],
        });
      }

      return "{}";
    };

    const result = await runPipeline({ rootDir, agentExecutor: executor });
    const facets = result.results[0].facets;
    const sections = (facets.summary.data as any).summary.sections;
    const concepts = (facets.concepts.data as any).concepts;
    const argumentsData = (facets.arguments.data as any).arguments;
    const questions = (facets.qa.data as any).questions;

    expect(sections.length).toBeGreaterThan(1);
    expect(new Set(sections.map((section: any) => section.id)).size).toBe(sections.length);
    expect(sections[0].id).toBe("sec-1");
    expect(sections.slice(1).every((section: any) => section.id.startsWith("sec-1-chunk-"))).toBe(true);

    expect(concepts.length).toBeGreaterThan(1);
    expect(new Set(concepts.map((concept: any) => concept.id)).size).toBe(concepts.length);
    expect(concepts[0].id).toBe("concept-1");
    expect(concepts.slice(1).every((concept: any) => concept.id.startsWith("concept-1-chunk-"))).toBe(true);

    expect(argumentsData.length).toBeGreaterThan(1);
    expect(new Set(argumentsData.map((argument: any) => argument.id)).size).toBe(argumentsData.length);
    expect(argumentsData[0].id).toBe("arg-1");
    expect(argumentsData.slice(1).every((argument: any) => argument.id.startsWith("arg-1-chunk-"))).toBe(true);

    expect(questions.length).toBeGreaterThan(1);
    expect(new Set(questions.map((question: any) => question.id)).size).toBe(questions.length);
    expect(questions[0].id).toBe("q-1");
    expect(questions.slice(1).every((question: any) => question.id.startsWith("q-1-chunk-"))).toBe(true);
  });

  it("offsets chunk source lines before linking supporting arguments", async () => {
    const largeContent = [
      "# Main A",
      "alpha",
      ...Array.from({ length: 9000 }, () => "A".repeat(12)),
      "# Main B",
      "beta",
      ...Array.from({ length: 9000 }, () => "B".repeat(12)),
    ].join("\n");
    await createTestFile("chunk-lines.md", largeContent);

    const executor: AgentExecutor = async (prompt) => {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      if (prompt.includes("summarization specialist")) {
        return JSON.stringify({
          documentId,
          summary: { thesis: "T", overview: "O", sections: [] },
        });
      }
      if (prompt.includes("concept extraction specialist")) {
        return JSON.stringify({ documentId, concepts: [], relationships: [] });
      }
      if (prompt.includes("comprehension assessment specialist")) {
        return JSON.stringify({ documentId, questions: [] });
      }
      if (prompt.includes("argument analysis specialist") && prompt.includes("chunk 1/")) {
        return JSON.stringify({
          documentId,
          arguments: [
            {
              id: "arg-1",
              claim: "Main claim A",
              type: "main",
              evidence: [],
              assumptions: [],
              gaps: [],
              sourceRefs: [{ documentId, startLine: 1, endLine: 2, excerpt: "alpha" }],
            },
          ],
        });
      }
      if (prompt.includes("argument analysis specialist")) {
        return JSON.stringify({
          documentId,
          arguments: [
            {
              id: "arg-1",
              claim: "Main claim B",
              type: "main",
              evidence: [],
              assumptions: [],
              gaps: [],
              sourceRefs: [{ documentId, startLine: 1, endLine: 2, excerpt: "beta" }],
            },
            {
              id: "arg-2",
              claim: "Support for B",
              type: "supporting",
              evidence: [],
              assumptions: [],
              gaps: [],
              sourceRefs: [{ documentId, startLine: 3, endLine: 4, excerpt: "beta support" }],
            },
          ],
        });
      }
      return "{}";
    };

    const result = await runPipeline({ rootDir, agentExecutor: executor });
    const graphRaw = await readFile(join(rootDir, ".text-comprehend", "knowledge-graph.json"), "utf-8");
    const graph = JSON.parse(graphRaw);
    const supportEdge = graph.edges.find((edge: any) => edge.source.startsWith("arg-2") && edge.type === "supports");

    expect(result.results[0].facets.arguments.success).toBe(true);
    expect(supportEdge).toBeDefined();
    expect(supportEdge.target).toBe("arg-1-chunk-2");
  });

  it("processes only the requested file in single-file mode", async () => {
    await createTestFile("a.md", "# A\n\nalpha");
    await createTestFile("b.md", "# B\n\nbeta");

    const result = await runSingleFilePipeline({
      rootDir,
      relativePath: "b.md",
      agentExecutor: createMockExecutor(),
    });

    expect(result.documentsProcessed).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].filePath).toBe("b.md");

    const manifestRaw = await readFile(join(rootDir, ".text-comprehend", "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(Object.keys(manifest.files)).toEqual(["b.md"]);
  });

  it("updates an existing manifest entry without reprocessing other files", async () => {
    await createTestFile("existing.md", "# Existing\n\nold");
    await createTestFile("target.md", "# Target\n\ncontent");

    await runPipeline({ rootDir, agentExecutor: createMockExecutor() });

    const prompts: string[] = [];
    const executor: AgentExecutor = async (prompt) => {
      prompts.push(prompt);
      return createMockExecutor()(prompt);
    };

    const result = await runSingleFilePipeline({
      rootDir,
      relativePath: "target.md",
      agentExecutor: executor,
    });

    expect(result.documentsProcessed).toBe(1);
    expect(prompts).toHaveLength(4);
    expect(prompts.every((prompt) => prompt.includes("target.md"))).toBe(true);
  });
});
