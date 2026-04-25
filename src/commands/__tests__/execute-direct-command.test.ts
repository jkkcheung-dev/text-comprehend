import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { AgentExecutor, PipelineResult } from "../../../packages/core/src/pipeline/index.js";
import { executeDirectCommand } from "../index.js";

const noopExecutor: AgentExecutor = async () => "{}";

function createMockExecutor(): AgentExecutor {
  return async (prompt) => {
    if (prompt.includes("summarization specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
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
              sourceRange: { documentId, startLine: 1, endLine: 2, excerpt: "excerpt" },
            },
          ],
        },
      });
    }

    if (prompt.includes("concept extraction specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({ documentId, concepts: [], relationships: [] });
    }

    if (prompt.includes("argument analysis specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({ documentId, arguments: [] });
    }

    const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
    return JSON.stringify({ documentId, questions: [] });
  };
}

function createPipelineResult(overrides: Partial<PipelineResult> = {}): PipelineResult {
  return {
    documentsProcessed: 1,
    documentsSkipped: 0,
    facetsSucceeded: 4,
    facetsFailed: 0,
    results: [],
    errors: [],
    review: {
      ran: false,
      strict: false,
      report: null,
    },
    ...overrides,
  };
}

describe("executeDirectCommand", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "tc-plugin-"));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("routes /comprehend --retry-failed through the repository workflow", async () => {
    const runComprehendWorkflow = vi.fn().mockResolvedValue(createPipelineResult({
      documentsProcessed: 2,
      documentsSkipped: 3,
      facetsSucceeded: 5,
    }));

    const output = await executeDirectCommand(
      {
        command: "comprehend",
        argumentsText: "--retry-failed",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow,
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(runComprehendWorkflow).toHaveBeenCalledWith({
      rootDir: "/repo",
      retryFailed: true,
      agentExecutor: noopExecutor,
    });
    expect(output).toContain("Retry failed facets: yes");
  });

  it("returns analyzed output for /comprehend-summary <file> through the real workflow stack", async () => {
    await writeFile(join(rootDir, "docs-example.md"), "# Example Doc\n\ncontent", "utf-8");
    const agentExecutor = createMockExecutor();

    await executeDirectCommand({
      command: "comprehend",
      argumentsText: "",
      rootDir,
      agentExecutor,
    });

    const output = await executeDirectCommand({
      command: "comprehend-summary",
      argumentsText: "docs-example.md",
      rootDir,
      agentExecutor,
    });

    expect(output).toContain("Status: analyzed");
    expect(output).toContain("Document: docs-example.md");
    expect(output).toContain("Title: Example Doc");
  });
});
