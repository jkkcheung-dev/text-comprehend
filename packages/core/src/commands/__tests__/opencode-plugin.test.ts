import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { AgentExecutor, PipelineResult } from "../../pipeline/index.js";
import {
  createOpencodeCommandHook,
  executeDirectCommand,
} from "../opencode-plugin.js";

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

describe("OpenCode command execution", () => {
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
    expect(output).toContain("Documents processed: 2");
    expect(output).toContain("Documents skipped: 3");
  });

  it("routes /comprehend review flags through the repository workflow", async () => {
    const runComprehendWorkflow = vi.fn().mockResolvedValue(createPipelineResult({
      review: {
        ran: true,
        strict: true,
        report: {
          version: "1.0.0",
          generatedAt: "2026-04-25T00:00:00.000Z",
          strict: true,
          summary: { errors: 1, warnings: 0, passed: false },
          findings: [],
        },
      },
    }));

    const output = await executeDirectCommand(
      {
        command: "comprehend",
        argumentsText: "--review --review-strict",
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
      retryFailed: false,
      review: true,
      reviewStrict: true,
      agentExecutor: noopExecutor,
    });
    expect(output).toContain("Review strict mode: yes");
    expect(output).toContain("Review errors: 1");
  });

  it("lists analyzed documents when /comprehend-summary runs without a file argument", async () => {
    const listAnalyzedDocuments = vi.fn().mockResolvedValue([
      {
        id: "doc-1",
        filePath: "docs/example.md",
        title: "Example Doc",
      },
    ]);

    const output = await executeDirectCommand(
      {
        command: "comprehend-summary",
        argumentsText: "",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments,
      },
    );

    expect(listAnalyzedDocuments).toHaveBeenCalledWith("/repo");
    expect(output).toContain("Analyzed documents");
    expect(output).toContain("docs/example.md");
    expect(output).toContain("Example Doc");
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

    expect(output).toContain("Repository-backed /comprehend-summary result");
    expect(output).toContain("Status: analyzed");
    expect(output).toContain("Document: docs-example.md");
    expect(output).toContain("Title: Example Doc");
    expect(output).toContain("> Source: `docs-example.md`");
  });

  it("surfaces analyzed-on-demand output for /comprehend-summary <file> through the real workflow stack", async () => {
    await writeFile(join(rootDir, "new-note.md"), "# New Note\n\ncontent", "utf-8");
    const agentExecutor = createMockExecutor();

    const output = await executeDirectCommand({
      command: "comprehend-summary",
      argumentsText: "new-note.md",
      rootDir,
      agentExecutor,
    });

    expect(output).toContain("Repository-backed /comprehend-summary result");
    expect(output).toContain("Status: analyzed-on-demand");
    expect(output).toContain("Document: new-note.md");
    expect(output).toContain("Title: New Note");
    expect(output).toContain("> Source: `new-note.md`");
  });

  it("injects repository-backed command results into the current command output", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn().mockResolvedValue("Repository-backed result body"),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend",
      sessionID: "session-1",
      arguments: "--retry-failed",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Repository-backed result body",
      },
    ]);
  });

  it("ignores unrelated slash commands", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn(),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "other-command",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(false);
    expect(output.parts).toEqual([]);
  });
});
