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

export function formatDashboardLaunchResult(
  launch: DashboardLaunchResult,
  browserOpen: BrowserOpenStatus,
): string {
  if (launch.status !== "ready") {
    return launch.status === "launch-failed" && launch.detail
      ? `${launch.message}\n${launch.detail}`
      : launch.message;
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
