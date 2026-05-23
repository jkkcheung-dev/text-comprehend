import { spawn } from "node:child_process";
import type { AgentExecutor } from "../../../packages/core/src/pipeline/index.js";
import { executeDirectCommand, type DirectCommandExecutionOptions } from "../../commands/index.js";
import { launchDashboardWithDefaults, type DashboardLaunchResult } from "../../dashboard/launch-dashboard.js";
import {
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
  ) => Promise<string | DashboardLaunchHookResult>;
  launchDashboard?: (options: { workspaceRoot: string }) => Promise<DashboardLaunchResult>;
  openBrowserUrl?: (url: string) => Promise<BrowserOpenStatus>;
}

interface DashboardLaunchHookResult {
  launch: DashboardLaunchResult;
  browserOpen: BrowserOpenStatus;
}

const HANDLED_COMMANDS = new Set(["comprehend", "comprehend-summary", "comprehend-chat", "comprehend-explore"]);

function isDashboardLaunchHookResult(result: string | DashboardLaunchHookResult): result is DashboardLaunchHookResult {
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
    const child = spawn(command.command, command.args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", (error) => {
      resolvePromise({ status: "failed", detail: error.message });
    });
    child.once("spawn", () => {
      child.unref();
      resolvePromise({ status: "opened" });
    });
  });
}

export function createOpencodeCommandHook(dependencies: OpencodeCommandHookDependencies) {
  const executeCommand = dependencies.executeCommand ?? executeDirectCommand;
  const launchDashboard = dependencies.launchDashboard ?? launchDashboardWithDefaults;
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

    if (input.command === "comprehend-explore" && !dependencies.executeCommand) {
      const launch = await launchDashboard({ workspaceRoot: dependencies.rootDir });
      const browserOpen: BrowserOpenStatus = launch.status === "ready"
        ? await openBrowserUrl(launch.url)
        : { status: "unsupported" };

      output.parts = [{ type: "text", text: formatDashboardLaunchResult(launch, browserOpen) }];
      return true;
    }

    const result = await executeCommand({
      command: input.command as DirectCommandExecutionOptions["command"],
      argumentsText: input.arguments,
      rootDir: dependencies.rootDir,
      agentExecutor: dependencies.agentExecutor,
    });

    let text: string;

    if (input.command === "comprehend-explore" && isDashboardLaunchHookResult(result)) {
      text = formatDashboardLaunchResult(result.launch, result.browserOpen);
    } else {
      text = typeof result === "string" ? result : result.launch.message;
    }

    output.parts = [{ type: "text", text }];

    return true;
  };
}
