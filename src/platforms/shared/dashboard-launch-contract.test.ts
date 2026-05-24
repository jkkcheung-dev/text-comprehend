import { describe, expect, it } from "vitest";

import {
  formatDashboardLaunchCommandResult,
  type DashboardLaunchCommandResult,
} from "./dashboard-launch-adapter.js";

function renderWithoutBrowserSupport(result: DashboardLaunchCommandResult): string {
  return formatDashboardLaunchCommandResult(result);
}

function renderWithBrowserSupport(result: DashboardLaunchCommandResult): string {
  return formatDashboardLaunchCommandResult(result);
}

describe("dashboard launch adapter contract", () => {
  it("formats ready results for adapters without browser-open capability", () => {
    const result = {
      launch: {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      browserOpen: { status: "unsupported" },
    } satisfies DashboardLaunchCommandResult;

    expect(renderWithoutBrowserSupport(result)).toBe(
      "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173",
    );
  });

  it("formats ready results for adapters with browser-open capability", () => {
    const result = {
      launch: {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      browserOpen: { status: "opened" },
    } satisfies DashboardLaunchCommandResult;

    expect(renderWithBrowserSupport(result)).toBe(
      "Opened dashboard: http://127.0.0.1:4173",
    );
  });

  it("formats missing analysis output without browser integration using the stable message", () => {
    const result = {
      launch: {
        status: "missing-analysis-output",
        workspaceRoot: "/repo",
        message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
      },
      browserOpen: { status: "unsupported" },
    } satisfies DashboardLaunchCommandResult;

    expect(renderWithoutBrowserSupport(result)).toBe(
      "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    );
  });

  it("formats launch failures without browser integration using the stable message only", () => {
    const result = {
      launch: {
        status: "launch-failed",
        workspaceRoot: "/repo",
        message: "Failed to launch the dashboard. Try again.",
        detail: "dashboard crashed with internal trace",
      },
      browserOpen: { status: "unsupported", detail: "hidden capability detail" },
    } satisfies DashboardLaunchCommandResult;

    expect(renderWithoutBrowserSupport(result)).toBe(
      "Failed to launch the dashboard. Try again.",
    );
  });
});
