import { spawn } from "node:child_process";
import type { AgentExecutor } from "../../../packages/core/src/pipeline/index.js";
import { executeDirectCommand, type DirectCommandExecutionOptions } from "../../commands/index.js";
import {
  type DashboardLaunchCommandResult,
  formatDashboardLaunchResult,
  type BrowserOpenStatus,
} from "../shared/dashboard-launch-adapter.js";

export interface SessionPromptClient {
  session: Record<string, unknown>;
}

export interface OpencodeCommandHookDependencies {
  rootDir: string;
  agentExecutor: AgentExecutor;
  executeCommand?: (
    options: DirectCommandExecutionOptions,
  ) => Promise<string | DashboardLaunchCommandResult>;
  openBrowserUrl?: (url: string) => Promise<BrowserOpenStatus>;
}

const HANDLED_COMMANDS = new Set(["comprehend", "comprehend-summary", "comprehend-chat", "comprehend-explore"]);
const BROWSER_OPEN_GRACE_PERIOD_MS = 50;

function isDashboardLaunchHookResult(result: string | DashboardLaunchCommandResult): result is DashboardLaunchCommandResult {
  return typeof result === "object" && result !== null && "launch" in result && "browserOpen" in result;
}

function getBrowserOpenCommand(url: string): { command: string; args: string[] } | null {
  if (process.platform === "darwin") {
    return { command: "open", args: [url] };
  }

  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }

  if (process.platform === "linux") {
    return { command: "xdg-open", args: [url] };
  }

  return null;
}

async function defaultOpenBrowserUrl(url: string): Promise<BrowserOpenStatus> {
  const command = getBrowserOpenCommand(url);
  if (!command) {
    return { status: "unsupported", detail: `Unsupported platform: ${process.platform}` };
  }

  return new Promise<BrowserOpenStatus>((resolvePromise) => {
    let settled = false;
    let successTimer: ReturnType<typeof setTimeout> | undefined;

    const resolveOnce = (result: BrowserOpenStatus) => {
      if (settled) {
        return;
      }

      settled = true;
      if (successTimer) {
        clearTimeout(successTimer);
      }
      resolvePromise(result);
    };

    const child = spawn(command.command, command.args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", (error) => {
      resolveOnce({ status: "failed", detail: error.message });
    });
    child.once("spawn", () => {
      child.unref();
      successTimer = setTimeout(() => {
        resolveOnce({ status: "opened" });
      }, BROWSER_OPEN_GRACE_PERIOD_MS);
    });
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolveOnce({ status: "opened" });
        return;
      }

      if (code !== null) {
        resolveOnce({ status: "failed", detail: `Browser open command exited with code ${code}` });
        return;
      }

      resolveOnce({ status: "failed", detail: `Browser open command exited with signal ${signal ?? "unknown"}` });
    });
  });
}

export function createOpencodeCommandHook(dependencies: OpencodeCommandHookDependencies) {
  const executeCommand = dependencies.executeCommand ?? executeDirectCommand;
  const openBrowserUrl = dependencies.openBrowserUrl ?? defaultOpenBrowserUrl;

  return async (input: {
    command: string;
    sessionID: string;
    arguments: string;
  }, output: {
    parts: Array<{ type: "text"; text: string }>;
  }): Promise<boolean> => {
    if (!HANDLED_COMMANDS.has(input.command)) {
      return false;
    }

    const result = await executeCommand({
      command: input.command as DirectCommandExecutionOptions["command"],
      argumentsText: input.arguments,
      rootDir: dependencies.rootDir,
      agentExecutor: dependencies.agentExecutor,
    });

    if (input.command === "comprehend-explore") {
      if (!isDashboardLaunchHookResult(result)) {
        throw new Error("Expected a structured dashboard launch result for /comprehend-explore.");
      }

      const browserOpen = result.launch.status === "ready"
        ? await openBrowserUrl(result.launch.url)
        : result.browserOpen;

      output.parts = [{ type: "text", text: formatDashboardLaunchResult(result.launch, browserOpen) }];
      return true;
    }

    if (typeof result !== "string") {
      throw new Error(`Expected a string command result for /${input.command}.`);
    }

    output.parts = [{ type: "text", text: result }];

    return true;
  };
}
