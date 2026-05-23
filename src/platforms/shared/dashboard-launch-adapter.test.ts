import { describe, expect, it } from "vitest";

import { formatDashboardLaunchResult } from "./dashboard-launch-adapter.js";

describe("formatDashboardLaunchResult", () => {
  it("returns the launch message when launch is not ready", () => {
    const message = formatDashboardLaunchResult(
      {
        status: "missing-analysis-output",
        workspaceRoot: "/repo",
        message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
      },
      { status: "unsupported" },
    );

    expect(message).toBe("Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.");
  });

  it("preserves launch failure detail when launch is not ready", () => {
    const message = formatDashboardLaunchResult(
      {
        status: "launch-failed",
        workspaceRoot: "/repo",
        message: "Failed to launch the dashboard.",
        detail: "dashboard crashed",
      },
      { status: "failed", detail: "spawn xdg-open ENOENT" },
    );

    expect(message).toBe("Failed to launch the dashboard.\ndashboard crashed");
  });

  it("returns the opened dashboard message when browser open succeeds", () => {
    const message = formatDashboardLaunchResult(
      {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      { status: "opened" },
    );

    expect(message).toBe("Opened dashboard: http://127.0.0.1:4173");
  });

  it("returns a manual-open message when browser open is unsupported", () => {
    const message = formatDashboardLaunchResult(
      {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      { status: "unsupported" },
    );

    expect(message).toBe(
      "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173",
    );
  });

  it("includes the failure detail and manual-open line when browser open fails", () => {
    const message = formatDashboardLaunchResult(
      {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      { status: "failed", detail: "spawn xdg-open ENOENT" },
    );

    expect(message).toBe(
      "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173\nBrowser open failed: spawn xdg-open ENOENT",
    );
  });
});
