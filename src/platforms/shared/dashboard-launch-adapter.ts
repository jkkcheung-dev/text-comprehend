import type { DashboardLaunchResult } from "../../dashboard/launch-dashboard.js";

export type BrowserOpenStatus =
  | {
      status: "opened";
    }
  | {
      status: "unsupported";
      detail?: string;
    }
  | {
      status: "failed";
      detail?: string;
    };

export interface DashboardLaunchCommandResult {
  launch: DashboardLaunchResult;
  browserOpen: BrowserOpenStatus;
}

export function formatDashboardLaunchCommandResult(result: DashboardLaunchCommandResult): string {
  return formatDashboardLaunchResult(result.launch, result.browserOpen);
}

export function formatDashboardLaunchResult(
  launch: DashboardLaunchResult,
  browserOpen: BrowserOpenStatus,
): string {
  if (launch.status !== "ready") {
    return launch.message;
  }

  if (browserOpen.status === "opened") {
    return `Opened dashboard: ${launch.url}`;
  }

  const manualOpenMessage = `${launch.message}\nOpen this URL manually: ${launch.url}`;

  if (browserOpen.status === "unsupported") {
    return manualOpenMessage;
  }

  return `${manualOpenMessage}\nBrowser open failed: ${browserOpen.detail ?? "unknown error"}`;
}
