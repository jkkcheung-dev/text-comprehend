import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDashboardLauncher, launchDashboard } from "./launch-dashboard.js";

function createMockChildProcess() {
  const child = new EventEmitter() as EventEmitter & {
    unref: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
    pid: number;
    exitCode: number | null;
    killed: boolean;
    connected: boolean;
  };

  child.unref = vi.fn();
  child.disconnect = vi.fn().mockImplementation(() => {
    child.connected = false;
  });
  child.kill = vi.fn().mockImplementation(() => {
    child.killed = true;
    return true;
  });
  child.pid = 1234;
  child.exitCode = null;
  child.killed = false;
  child.connected = true;

  return child;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.doUnmock("node:child_process");
  vi.resetModules();
});

describe("launchDashboard", () => {
  it("returns missing-analysis-output when analysis output is absent", async () => {
    const ensureDashboardBuild = vi.fn().mockResolvedValue(undefined);
    const startDashboardServer = vi.fn().mockResolvedValue({ url: "http://127.0.0.1:4173" });

    const result = await launchDashboard({
      workspaceRoot: "/repo",
      artifactsExist: vi.fn().mockResolvedValue(false),
      ensureDashboardBuild,
      startDashboardServer,
    });

    expect(result).toEqual({
      status: "missing-analysis-output",
      workspaceRoot: "/repo",
      message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    });
    expect(ensureDashboardBuild).not.toHaveBeenCalled();
    expect(startDashboardServer).not.toHaveBeenCalled();
  });

  it("builds and starts the dashboard when artifacts exist", async () => {
    const ensureDashboardBuild = vi.fn().mockResolvedValue(undefined);
    const startDashboardServer = vi.fn().mockResolvedValue({ url: "http://127.0.0.1:4173" });

    const result = await launchDashboard({
      workspaceRoot: "/repo",
      artifactsExist: vi.fn().mockResolvedValue(true),
      ensureDashboardBuild,
      startDashboardServer,
    });

    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4173",
      message: "Dashboard ready: http://127.0.0.1:4173",
    });
    expect(ensureDashboardBuild).toHaveBeenCalledTimes(1);
    expect(startDashboardServer).toHaveBeenCalledTimes(1);
    expect(startDashboardServer).toHaveBeenCalledWith("/repo", 4173);
    expect(ensureDashboardBuild.mock.invocationCallOrder[0]).toBeLessThan(
      startDashboardServer.mock.invocationCallOrder[0],
    );
  });

  it("retries with the next port when the preferred port is unavailable", async () => {
    const ensureDashboardBuild = vi.fn().mockResolvedValue(undefined);
    const portInUseError = new Error("port unavailable");
    Object.assign(portInUseError, { code: "EADDRINUSE" });
    const startDashboardServer = vi
      .fn()
      .mockRejectedValueOnce(portInUseError)
      .mockResolvedValueOnce({ url: "http://127.0.0.1:4174" });

    const result = await launchDashboard({
      workspaceRoot: "/repo",
      artifactsExist: vi.fn().mockResolvedValue(true),
      ensureDashboardBuild,
      startDashboardServer,
    });

    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4174",
      message: "Dashboard ready: http://127.0.0.1:4174",
    });
    expect(ensureDashboardBuild).toHaveBeenCalledTimes(1);
    expect(startDashboardServer).toHaveBeenCalledTimes(2);
    expect(startDashboardServer).toHaveBeenNthCalledWith(1, "/repo", 4173);
    expect(startDashboardServer).toHaveBeenNthCalledWith(2, "/repo", 4174);
  });

  it("reuses an already-running server for the same workspace", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);
    const isPreviewServerRunning = vi.fn().mockResolvedValue(true);

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
      isPreviewServerRunning,
    });

    const firstResult = await launch({ workspaceRoot: "/repo-reuse" });
    const secondResult = await launch({ workspaceRoot: "/repo-reuse" });

    expect(firstResult).toEqual({
      status: "ready",
      workspaceRoot: "/repo-reuse",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-reuse",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-reuse",
    });
    expect(secondResult).toEqual(firstResult);
    expect(isPreviewServerRunning).toHaveBeenCalledTimes(1);
    expect(isPreviewServerRunning).toHaveBeenCalledWith(
      "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-reuse",
    );
    expect(runBuild).toHaveBeenCalledTimes(1);
    expect(startPreviewServer).toHaveBeenCalledTimes(1);
    expect(startPreviewServer).toHaveBeenCalledWith(4173, "/repo-reuse");
  });

  it("drops a stale cached server entry and starts a new server", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);
    const isPreviewServerRunning = vi.fn().mockResolvedValue(false);

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
      isPreviewServerRunning,
    } as never);

    const firstResult = await launch({ workspaceRoot: "/repo-stale" });
    const secondResult = await launch({ workspaceRoot: "/repo-stale" });

    expect(firstResult).toEqual({
      status: "ready",
      workspaceRoot: "/repo-stale",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-stale",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-stale",
    });
    expect(secondResult).toEqual(firstResult);
    expect(isPreviewServerRunning).toHaveBeenCalledTimes(1);
    expect(isPreviewServerRunning).toHaveBeenCalledWith(
      "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-stale",
    );
    expect(startPreviewServer).toHaveBeenCalledTimes(2);
    expect(startPreviewServer).toHaveBeenNthCalledWith(1, 4173, "/repo-stale");
    expect(startPreviewServer).toHaveBeenNthCalledWith(2, 4173, "/repo-stale");
  });

  it("returns launch-failed with detail when startup fails", async () => {
    const ensureDashboardBuild = vi.fn().mockResolvedValue(undefined);
    const startDashboardServer = vi.fn().mockRejectedValue(new Error("dashboard crashed"));

    const result = await launchDashboard({
      workspaceRoot: "/repo",
      artifactsExist: vi.fn().mockResolvedValue(true),
      ensureDashboardBuild,
      startDashboardServer,
    });

    expect(result).toEqual({
      status: "launch-failed",
      workspaceRoot: "/repo",
      message: "Failed to launch the dashboard.",
      detail: "dashboard crashed",
    });
    expect(ensureDashboardBuild).toHaveBeenCalledTimes(1);
    expect(startDashboardServer).toHaveBeenCalledTimes(1);
    expect(startDashboardServer).toHaveBeenCalledWith("/repo", 4173);
  });

  it("checks for .text-comprehend/knowledge-graph.json inside the workspace", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
    });

    await launch({ workspaceRoot: "/repo" });

    expect(fileExists).toHaveBeenCalledWith("/repo/.text-comprehend/knowledge-graph.json");
  });

  it("returns a workspace-backed preview url when a real runtime starts", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
    });

    const result = await launch({ workspaceRoot: "/repo root" });

    expect(runBuild).toHaveBeenCalledWith(["run", "build", "--workspace", "@text-comprehend/dashboard"]);
    expect(startPreviewServer).toHaveBeenCalledWith(4173, "/repo root");
    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo root",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo%20root",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo%20root",
    });
  });

  it("starts the default preview process and waits for readiness before returning ready", async () => {
    const child = createMockChildProcess();
    const fork = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.emit("message", { type: "ready" });
      });

      return child;
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, fork };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(fork).toHaveBeenCalledWith(
      expect.stringContaining("src/dashboard/static-server.cjs"),
      ["4173", "/repo"],
      expect.objectContaining({
        cwd: expect.any(String),
        detached: true,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      }),
    );
    expect(child.unref).toHaveBeenCalledTimes(1);
    expect(child.disconnect).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo",
    });
  });

  it("returns launch-failed when the default preview process exits before readiness", async () => {
    const child = createMockChildProcess();
    const fork = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.exitCode = 1;
        child.emit("exit", 1, null);
      });

      return child;
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, fork };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(result).toEqual({
      status: "launch-failed",
      workspaceRoot: "/repo",
      message: "Failed to launch the dashboard.",
      detail: "Dashboard preview exited before becoming ready (code 1).",
    });
  });

  it("returns launch-failed when the default static server reports a startup error before exiting", async () => {
    const child = createMockChildProcess();
    const fork = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.emit("message", {
          type: "error",
          detail: "Static server failed to start.",
        });
        child.exitCode = 1;
        child.emit("exit", 1, null);
      });

      return child;
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, fork };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(result).toEqual({
      status: "launch-failed",
      workspaceRoot: "/repo",
      message: "Failed to launch the dashboard.",
      detail: "Static server failed to start.",
    });
  });

  it("kills the helper process when the default static server never becomes ready", async () => {
    vi.useFakeTimers();

    const child = createMockChildProcess();
    const fork = vi.fn().mockReturnValue(child);

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, fork };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const resultPromise = launch({ workspaceRoot: "/repo" });

    await vi.advanceTimersByTimeAsync(5000);

    const result = await resultPromise;

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(result).toEqual({
      status: "launch-failed",
      workspaceRoot: "/repo",
      message: "Failed to launch the dashboard.",
      detail: "Dashboard preview did not become ready on port 4173.",
    });

    vi.useRealTimers();
  });

  it("retries the next port when the default static server reports EADDRINUSE", async () => {
    const firstChild = createMockChildProcess();
    const secondChild = createMockChildProcess();
    const fork = vi.fn().mockImplementation((_modulePath: string, args: string[]) => {
      const port = args[0];

      if (port === "4173") {
        queueMicrotask(() => {
          firstChild.emit("message", { type: "error", code: "EADDRINUSE", detail: "EADDRINUSE: port already in use" });
          firstChild.exitCode = 1;
          firstChild.emit("exit", 1, null);
        });

        return firstChild;
      }

      queueMicrotask(() => {
        secondChild.emit("message", { type: "ready" });
      });

      return secondChild;
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, fork };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(fork).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("src/dashboard/static-server.cjs"),
      ["4173", "/repo"],
      expect.any(Object),
    );
    expect(fork).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("src/dashboard/static-server.cjs"),
      ["4174", "/repo"],
      expect.any(Object),
    );
    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4174/?source=workspace&workspaceRoot=%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4174/?source=workspace&workspaceRoot=%2Frepo",
    });
  });

});
