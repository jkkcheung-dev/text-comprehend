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

  it("routes /comprehend-explore through the shared dashboard launcher", async () => {
    const launchExploreDashboard = vi.fn().mockResolvedValue({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://localhost:4173",
      message: "Dashboard ready: http://localhost:4173",
    });

    const output = await executeDirectCommand(
      {
        command: "comprehend-explore",
        argumentsText: "",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
        launchExploreDashboard,
      },
    );

    expect(launchExploreDashboard).toHaveBeenCalledWith({ workspaceRoot: "/repo" });
    expect(output).toBe("Dashboard ready: http://localhost:4173\nOpen this URL manually: http://localhost:4173");
  });

  it("returns missing analysis guidance for /comprehend-explore", async () => {
    const launchExploreDashboard = vi.fn().mockResolvedValue({
      status: "missing-analysis-output",
      workspaceRoot: "/repo",
      message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    });

    const output = await executeDirectCommand(
      {
        command: "comprehend-explore",
        argumentsText: "",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
        launchExploreDashboard,
      },
    );

    expect(output).toBe("Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.");
  });

  it("uses the real dashboard launcher by default for /comprehend-explore", async () => {
    vi.resetModules();
    const launchDashboardWithDefaults = vi.fn().mockResolvedValue({
      status: "launch-failed",
      workspaceRoot: "/repo",
      message: "Failed to launch the dashboard.",
      detail: "Preview server startup is not implemented.",
    });

    vi.doMock("../../dashboard/launch-dashboard.js", async () => {
      const actual = await vi.importActual<typeof import("../../dashboard/launch-dashboard.js")>(
        "../../dashboard/launch-dashboard.js",
      );

      return {
        ...actual,
        launchDashboardWithDefaults,
      };
    });

    const { executeDirectCommand: executeDirectCommandWithDefaults } = await import("../execute-direct-command.js");

    const output = await executeDirectCommandWithDefaults(
      {
        command: "comprehend-explore",
        argumentsText: "",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(launchDashboardWithDefaults).toHaveBeenCalledWith({ workspaceRoot: "/repo" });
    expect(output).toBe("Failed to launch the dashboard.\nPreview server startup is not implemented.");

    vi.doUnmock("../../dashboard/launch-dashboard.js");
    vi.resetModules();
  });

  it("uses the default dashboard launcher ready output for /comprehend-explore", async () => {
    vi.resetModules();
    const launchDashboardWithDefaults = vi.fn().mockResolvedValue({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4173",
      message: "Dashboard ready: http://127.0.0.1:4173",
    });

    vi.doMock("../../dashboard/launch-dashboard.js", async () => {
      const actual = await vi.importActual<typeof import("../../dashboard/launch-dashboard.js")>(
        "../../dashboard/launch-dashboard.js",
      );

      return {
        ...actual,
        launchDashboardWithDefaults,
      };
    });

    const { executeDirectCommand: executeDirectCommandWithDefaults } = await import("../execute-direct-command.js");

    const output = await executeDirectCommandWithDefaults(
      {
        command: "comprehend-explore",
        argumentsText: "",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(launchDashboardWithDefaults).toHaveBeenCalledWith({ workspaceRoot: "/repo" });
    expect(output).toBe("Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173");

    vi.doUnmock("../../dashboard/launch-dashboard.js");
    vi.resetModules();
  });

  it("uses the default dashboard launcher missing-analysis output for /comprehend-explore", async () => {
    vi.resetModules();
    const launchDashboardWithDefaults = vi.fn().mockResolvedValue({
      status: "missing-analysis-output",
      workspaceRoot: "/repo",
      message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    });

    vi.doMock("../../dashboard/launch-dashboard.js", async () => {
      const actual = await vi.importActual<typeof import("../../dashboard/launch-dashboard.js")>(
        "../../dashboard/launch-dashboard.js",
      );

      return {
        ...actual,
        launchDashboardWithDefaults,
      };
    });

    const { executeDirectCommand: executeDirectCommandWithDefaults } = await import("../execute-direct-command.js");

    const output = await executeDirectCommandWithDefaults(
      {
        command: "comprehend-explore",
        argumentsText: "",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(launchDashboardWithDefaults).toHaveBeenCalledWith({ workspaceRoot: "/repo" });
    expect(output).toBe("Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.");

    vi.doUnmock("../../dashboard/launch-dashboard.js");
    vi.resetModules();
  });
});
