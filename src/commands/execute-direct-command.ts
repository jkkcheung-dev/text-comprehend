import type { AgentExecutor, PipelineResult } from "../../packages/core/src/pipeline/index.js";
import {
  listAnalyzedDocuments,
  resolveChatWorkflow,
  resolveSummaryWorkflow,
  runComprehendWorkflow,
} from "../../packages/core/src/commands/workflows.js";
import { launchDashboardWithDefaults, type DashboardLaunchResult } from "../dashboard/launch-dashboard.js";
import { formatDashboardLaunchResult } from "../platforms/shared/dashboard-launch-adapter.js";

import type { SupportedCommand } from "./types.js";

export interface DirectCommandExecutionOptions {
  command: SupportedCommand;
  argumentsText: string;
  rootDir: string;
  agentExecutor: AgentExecutor;
}

export interface CommandWorkflowDependencies {
  runComprehendWorkflow: typeof runComprehendWorkflow;
  resolveSummaryWorkflow: typeof resolveSummaryWorkflow;
  resolveChatWorkflow: typeof resolveChatWorkflow;
  listAnalyzedDocuments: typeof listAnalyzedDocuments;
  launchExploreDashboard?: (options: { workspaceRoot: string }) => Promise<DashboardLaunchResult>;
}

async function launchExploreDashboard(options: { workspaceRoot: string }): Promise<DashboardLaunchResult> {
  return launchDashboardWithDefaults(options);
}

function parseRetryFailed(argumentsText: string): boolean {
  return argumentsText.split(/\s+/).filter(Boolean).includes("--retry-failed");
}

function parseFlag(argumentsText: string, flag: string): boolean {
  return argumentsText.split(/\s+/).filter(Boolean).includes(flag);
}

function formatPipelineResult(result: PipelineResult, retryFailed: boolean): string {
  const lines = [
    "Repository-backed /comprehend result",
    `Retry failed facets: ${retryFailed ? "yes" : "no"}`,
    `Documents processed: ${result.documentsProcessed}`,
    `Documents skipped: ${result.documentsSkipped}`,
    `Facets succeeded: ${result.facetsSucceeded}`,
    `Facets failed: ${result.facetsFailed}`,
  ];

  if (result.review.ran && result.review.report) {
    lines.push(`Review strict mode: ${result.review.strict ? "yes" : "no"}`);
    lines.push(`Review errors: ${result.review.report.summary.errors}`);
    lines.push(`Review warnings: ${result.review.report.summary.warnings}`);
  }

  if (result.errors.length > 0) {
    lines.push("Errors:");
    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
  }

  lines.push("Outputs written under `.text-comprehend/`.");
  return lines.join("\n");
}

function formatAnalyzedDocuments(documents: Awaited<ReturnType<typeof listAnalyzedDocuments>>): string {
  if (documents.length === 0) {
    return [
      "Repository-backed /comprehend-summary result",
      "No analyzed documents found.",
      "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    ].join("\n");
  }

  return [
    "Repository-backed /comprehend-summary result",
    "Analyzed documents:",
    ...documents.map((document) => `- ${document.filePath} (${document.title})`),
  ].join("\n");
}

function formatSummaryResult(result: Awaited<ReturnType<typeof resolveSummaryWorkflow>>, filePath: string): string {
  if (result.status === "not-found") {
    return [
      "Repository-backed /comprehend-summary result",
      `File not found: ${filePath}`,
    ].join("\n");
  }

  return [
    "Repository-backed /comprehend-summary result",
    `Status: ${result.status}`,
    `Document: ${result.document.filePath}`,
    `Title: ${result.document.title}`,
    "",
    result.layeredSummary,
  ].join("\n");
}

function formatChatResult(result: Awaited<ReturnType<typeof resolveChatWorkflow>>): string {
  if (result.status === "missing-artifacts") {
    return [
      "Repository-backed /comprehend-chat result",
      "Missing analyzed artifacts.",
      "Run /comprehend first.",
    ].join("\n");
  }

  const lines = [
    "Repository-backed /comprehend-chat result",
    `Question: ${result.question}`,
    `Answer: ${result.answer}`,
  ];

  if (result.documents.length === 0) {
    lines.push("No analyzed documents matched this question.");
    return lines.join("\n");
  }

  lines.push("Relevant analyzed documents:");
  for (const document of result.documents) {
    lines.push(`- ${document.filePath} (${document.title})`);
    lines.push(document.layeredSummary);
  }

  return lines.join("\n");
}

export async function executeDirectCommand(
  options: DirectCommandExecutionOptions,
  dependencies: CommandWorkflowDependencies = {
    runComprehendWorkflow,
    resolveSummaryWorkflow,
    resolveChatWorkflow,
    listAnalyzedDocuments,
    launchExploreDashboard,
  },
): Promise<string> {
  const args = options.argumentsText.trim();

  switch (options.command) {
    case "comprehend": {
      const retryFailed = parseRetryFailed(args);
      const reviewStrict = parseFlag(args, "--review-strict");
      const review = reviewStrict || parseFlag(args, "--review");
      const result = await dependencies.runComprehendWorkflow({
        rootDir: options.rootDir,
        retryFailed,
        ...(review ? { review: true } : {}),
        ...(reviewStrict ? { reviewStrict: true } : {}),
        agentExecutor: options.agentExecutor,
      });
      return formatPipelineResult(result, retryFailed);
    }

    case "comprehend-summary": {
      if (!args) {
        const documents = await dependencies.listAnalyzedDocuments(options.rootDir);
        return formatAnalyzedDocuments(documents);
      }

      const result = await dependencies.resolveSummaryWorkflow({
        rootDir: options.rootDir,
        filePath: args,
        agentExecutor: options.agentExecutor,
      });
      return formatSummaryResult(result, args);
    }

    case "comprehend-chat": {
      const result = await dependencies.resolveChatWorkflow({
        rootDir: options.rootDir,
        question: args,
        agentExecutor: options.agentExecutor,
      });
      return formatChatResult(result);
    }

    case "comprehend-explore": {
      const launch = await (dependencies.launchExploreDashboard ?? launchExploreDashboard)({
        workspaceRoot: options.rootDir,
      });
      return formatDashboardLaunchResult(launch, { status: "unsupported" });
    }
  }
}
