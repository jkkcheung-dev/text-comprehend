import { describe, it, expect, vi } from "vitest";

import type { AgentExecutor, PipelineResult } from "../../pipeline/index.js";
import {
  createOpencodeCommandHook,
  executeDirectCommand,
} from "../opencode-plugin.js";

const noopExecutor: AgentExecutor = async () => "{}";

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
