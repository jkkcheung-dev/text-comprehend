import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDashboardLauncher, launchDashboard } from "./launch-dashboard.js";

function getNpmCommandForTest(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

type MockHttpResponse =
  | { statusCode: number; body: string }
  | { error: Error };

function mockHttpRequestSequence(responses: MockHttpResponse[]) {
  return vi.fn().mockImplementation((_url: string, _options: unknown, callback: (response: EventEmitter & { statusCode?: number }) => void) => {
    const requestEmitter = new EventEmitter() as EventEmitter & {
      setTimeout: (timeout: number, handler: () => void) => void;
      destroy: (error?: Error) => void;
      end: () => void;
    };

    requestEmitter.setTimeout = (_timeout: number, _handler: () => void) => {
      // The mocked requests resolve immediately.
    };
    requestEmitter.destroy = (error?: Error) => {
      if (error) {
        queueMicrotask(() => {
          requestEmitter.emit("error", error);
        });
      }
    };
    requestEmitter.end = () => {
      const nextResponse = responses.shift() ?? { error: new Error("No mock response configured") };

      queueMicrotask(() => {
        if ("error" in nextResponse) {
          requestEmitter.emit("error", nextResponse.error);
          return;
        }

        const response = new EventEmitter() as EventEmitter & { statusCode?: number };
        response.statusCode = nextResponse.statusCode;
        callback(response);
        response.emit("data", Buffer.from(nextResponse.body));
        response.emit("end");
      });
    };

    return requestEmitter;
  });
}

function mockNetCreateServerAvailability(availabilityByPort: Record<number, boolean>) {
  return vi.fn().mockImplementation(() => {
    const server = new EventEmitter() as EventEmitter & {
      listen: (port: number, host: string, callback: () => void) => void;
      close: (callback: () => void) => void;
      address: () => AddressInfo;
    };

    server.listen = (port: number, _host: string, callback: () => void) => {
      queueMicrotask(() => {
        if (availabilityByPort[port] === false) {
          const error = Object.assign(new Error(`listen EADDRINUSE: address already in use 127.0.0.1:${port}`), {
            code: "EADDRINUSE",
          });
          server.emit("error", error);
          return;
        }

        callback();
      });
    };
    server.close = (callback: () => void) => {
      queueMicrotask(callback);
    };
    server.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 0 });

    return server;
  });
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  await new Promise<void>((resolvePromise) => {
    const timeout = setTimeout(() => {
      resolvePromise();
    }, 5000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolvePromise();
    });

    try {
      if (child.pid && process.platform !== "win32") {
        process.kill(-child.pid, "SIGTERM");
        return;
      }

      child.kill("SIGTERM");
    } catch {
      clearTimeout(timeout);
      resolvePromise();
    }
  });
}

async function stopPortListener(_port: number): Promise<void> {
  return Promise.resolve();
}

function createMockChildProcess() {
  const child = new EventEmitter() as EventEmitter & {
    unref: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
    stdout: EventEmitter;
    stderr: EventEmitter;
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
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
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
  vi.doUnmock("node:http");
  vi.doUnmock("node:net");
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

  it("treats canonical-equivalent workspace roots as one cached preview identity", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);
    const isPreviewServerRunning = vi.fn().mockResolvedValue(true);
    const resolveWorkspaceRoot = vi.fn().mockResolvedValue("/canonical/repo");

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
      isPreviewServerRunning,
      resolveWorkspaceRoot,
    } as never);

    const firstResult = await launch({ workspaceRoot: "/repo-link-a" });
    const secondResult = await launch({ workspaceRoot: "/repo-link-b" });

    expect(firstResult).toEqual({
      status: "ready",
      workspaceRoot: "/repo-link-a",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Fcanonical%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Fcanonical%2Frepo",
    });
    expect(secondResult).toEqual({
      status: "ready",
      workspaceRoot: "/repo-link-b",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Fcanonical%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Fcanonical%2Frepo",
    });
    expect(fileExists).toHaveBeenCalledTimes(2);
    expect(fileExists).toHaveBeenNthCalledWith(1, "/canonical/repo/.text-comprehend/knowledge-graph.json");
    expect(fileExists).toHaveBeenNthCalledWith(2, "/canonical/repo/.text-comprehend/knowledge-graph.json");
    expect(resolveWorkspaceRoot).toHaveBeenCalledTimes(2);
    expect(startPreviewServer).toHaveBeenCalledTimes(1);
    expect(startPreviewServer).toHaveBeenCalledWith(4173, "/canonical/repo");
    expect(isPreviewServerRunning).toHaveBeenCalledTimes(1);
    expect(isPreviewServerRunning).toHaveBeenCalledWith(
      "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Fcanonical%2Frepo",
    );
  });

  it("returns missing-analysis-output when cached server exists but artifacts were removed", async () => {
    const fileExists = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);
    const isPreviewServerRunning = vi.fn().mockResolvedValue(true);
    const stopPreviewServer = vi.fn();

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
      isPreviewServerRunning,
      stopPreviewServer,
    });

    const firstResult = await launch({ workspaceRoot: "/repo-artifacts-removed" });
    const secondResult = await launch({ workspaceRoot: "/repo-artifacts-removed" });

    expect(firstResult).toEqual({
      status: "ready",
      workspaceRoot: "/repo-artifacts-removed",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-artifacts-removed",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-artifacts-removed",
    });
    expect(secondResult).toEqual({
      status: "missing-analysis-output",
      workspaceRoot: "/repo-artifacts-removed",
      message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    });
    expect(fileExists).toHaveBeenCalledTimes(2);
    expect(isPreviewServerRunning).not.toHaveBeenCalled();
    expect(stopPreviewServer).toHaveBeenCalledTimes(1);
    expect(stopPreviewServer).toHaveBeenCalledWith("/repo-artifacts-removed");
    expect(runBuild).toHaveBeenCalledTimes(1);
    expect(startPreviewServer).toHaveBeenCalledTimes(1);
  });

  it("treats a cached responder without dashboard content as stale and starts a new server", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);
    const isPreviewServerRunning = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
      isPreviewServerRunning,
    });

    const firstResult = await launch({ workspaceRoot: "/repo-impostor-server" });

    const secondResult = await launch({ workspaceRoot: "/repo-impostor-server" });

    expect(firstResult).toEqual({
      status: "ready",
      workspaceRoot: "/repo-impostor-server",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-impostor-server",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-impostor-server",
    });
    expect(secondResult).toEqual(firstResult);
    expect(isPreviewServerRunning).toHaveBeenCalledTimes(1);
    expect(runBuild).toHaveBeenCalledTimes(1);
    expect(startPreviewServer).toHaveBeenCalledTimes(1);
    expect(startPreviewServer).toHaveBeenNthCalledWith(1, 4173, "/repo-impostor-server");
  });

  it("drops a stale cached server entry and starts a new server", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);
    const isPreviewServerRunning = vi.fn().mockResolvedValue(false);
    const stopPreviewServer = vi.fn();

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
      isPreviewServerRunning,
      stopPreviewServer,
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
    expect(stopPreviewServer).toHaveBeenCalledTimes(1);
    expect(stopPreviewServer).toHaveBeenCalledWith("/repo-stale");
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
      message: "Failed to launch the dashboard. Try again.",
      detail: "dashboard crashed",
    });
    expect(ensureDashboardBuild).toHaveBeenCalledTimes(1);
    expect(startDashboardServer).toHaveBeenCalledTimes(1);
    expect(startDashboardServer).toHaveBeenCalledWith("/repo", 4173);
  });

  it("returns a stable build-failed message while retaining build diagnostics", async () => {
    const ensureDashboardBuild = vi
      .fn()
      .mockRejectedValue(new Error("npm run build --workspace @text-comprehend/dashboard exited with code 1"));
    const startDashboardServer = vi.fn().mockResolvedValue({ url: "http://127.0.0.1:4173" });

    const result = await launchDashboard({
      workspaceRoot: "/repo",
      artifactsExist: vi.fn().mockResolvedValue(true),
      ensureDashboardBuild,
      startDashboardServer,
    });

    expect(result).toEqual({
      status: "launch-failed",
      workspaceRoot: "/repo",
      message: "Failed to prepare the dashboard. Try again after fixing the dashboard build.",
      detail: "npm run build --workspace @text-comprehend/dashboard exited with code 1",
    });
    expect(startDashboardServer).not.toHaveBeenCalled();
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

  it("serves the dashboard shell and workspace artifacts from the launched runtime", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "text-comprehend-dashboard-"));
    const artifactPath = join(workspaceRoot, ".text-comprehend", "knowledge-graph.json");
    const artifactContent = JSON.stringify({ documentIds: ["doc-1"], source: "integration-test" }, null, 2);
    const children: ChildProcess[] = [];

    await mkdir(join(workspaceRoot, ".text-comprehend"), { recursive: true });
    await writeFile(artifactPath, artifactContent, "utf-8");

    await Promise.all([4173, 4174, 4175].map((port) => stopPortListener(port)));

    try {
      vi.resetModules();
      vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");

        return {
          ...actual,
          spawn: (...args: Parameters<typeof actual.spawn>) => {
            const child = actual.spawn(...args);
            children.push(child);
            return child;
          },
        };
      });

      const { launchDashboardWithDefaults } = await import("./launch-dashboard.js");
      const result = await launchDashboardWithDefaults({ workspaceRoot });

      if (result.status !== "ready") {
        throw new Error(`Expected ready launch result, received ${JSON.stringify(result)}`);
      }

      const dashboardResponse = await fetch(result.url);
      const artifactResponse = await fetch(
        new URL(
          `/__text-comprehend-workspace__/${encodeURIComponent(workspaceRoot)}/.text-comprehend/knowledge-graph.json`,
          result.url,
        ),
      );

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.headers.get("content-type")).toContain("text/html");
      expect(await dashboardResponse.text()).toContain('<div id="root"></div>');

      expect(artifactResponse.status).toBe(200);
      expect(artifactResponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await artifactResponse.text()).toBe(artifactContent);
    } finally {
      await Promise.all(children.map((child) => stopChild(child)));
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 20000);

  it("starts the default preview process and waits for readiness before returning ready", async () => {
    const child = createMockChildProcess();
    const request = mockHttpRequestSequence([
      { statusCode: 200, body: JSON.stringify({ status: "ready", workspaceRoot: "/repo" }) },
    ]);

    const spawn = vi.fn().mockImplementation(() => {
      return child;
    });

    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<typeof import("node:http")>("node:http");
      return { ...actual, request };
    });
    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

      expect(spawn).toHaveBeenCalledWith(
        getNpmCommandForTest(),
        [
          "run",
          "preview:host",
          "--workspace",
          "@text-comprehend/dashboard",
          "--",
          "--port",
          "4173",
          "--strictPort",
        ],
        expect.objectContaining({
          cwd: expect.any(String),
          detached: true,
        env: expect.objectContaining({
          TEXT_COMPREHEND_DASHBOARD_WORKSPACE_ROOT: "/repo",
        }),
        stdio: "ignore",
      }),
    );
    expect(child.unref).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo",
    });
  });

  it("returns launch-failed when the default preview process exits before readiness", async () => {
    const child = createMockChildProcess();
    const request = mockHttpRequestSequence([
      { error: new Error("connect ECONNREFUSED") },
      { error: new Error("connect ECONNREFUSED") },
      { error: new Error("connect ECONNREFUSED") },
      { error: new Error("connect ECONNREFUSED") },
    ]);
    const createServer = mockNetCreateServerAvailability({ 4173: true });
    const spawn = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.exitCode = 1;
        child.emit("exit", 1, null);
      });

      return child;
    });

    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<typeof import("node:http")>("node:http");
      return { ...actual, request };
    });
    vi.doMock("node:net", async () => {
      const actual = await vi.importActual<typeof import("node:net")>("node:net");
      return { ...actual, createServer };
    });
    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
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
      message: "Failed to launch the dashboard. Try again.",
      detail: "Dashboard preview exited before becoming ready (code 1).",
    });
  });

  it("adopts an already-running same-workspace preview when the spawned process exits", async () => {
    const child = createMockChildProcess();
    const request = mockHttpRequestSequence([
      { error: new Error("connect ECONNREFUSED") },
      { statusCode: 200, body: JSON.stringify({ status: "ready", workspaceRoot: "/repo" }) },
      { statusCode: 200, body: JSON.stringify({ status: "ready", workspaceRoot: "/repo" }) },
    ]);
    const spawn = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.exitCode = 1;
        child.emit("exit", 1, null);
      });

      return child;
    });

    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<typeof import("node:http")>("node:http");
      return { ...actual, request };
    });
    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo",
    });
  });

  it("returns launch-failed when spawning vite preview fails immediately", async () => {
    const child = createMockChildProcess();
    const spawn = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.emit("error", Object.assign(new Error("spawn npm ENOENT"), { code: "ENOENT" }));
      });

      return child;
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
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
      message: "Failed to launch the dashboard. Try again.",
      detail: "spawn npm ENOENT",
    });
  });

  it("retries the next port when the preview health endpoint reports another workspace", async () => {
    const firstChild = createMockChildProcess();
    const secondChild = createMockChildProcess();
    const request = mockHttpRequestSequence([
      { statusCode: 200, body: JSON.stringify({ status: "ready", workspaceRoot: "/other-repo" }) },
      { statusCode: 200, body: JSON.stringify({ status: "ready", workspaceRoot: "/repo" }) },
    ]);

    const spawn = vi.fn().mockImplementation((_command: string, args: string[]) => {
      const port = args[args.length - 1];

      if (port === "4173") {
        return firstChild;
      }

      return secondChild;
    });

    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<typeof import("node:http")>("node:http");
      return { ...actual, request };
    });
    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(spawn).toHaveBeenNthCalledWith(
      1,
      getNpmCommandForTest(),
      [
        "run",
        "preview:host",
        "--workspace",
        "@text-comprehend/dashboard",
        "--",
        "--port",
        "4173",
        "--strictPort",
      ],
      expect.any(Object),
    );
    expect(spawn).toHaveBeenNthCalledWith(
      2,
      getNpmCommandForTest(),
      [
        "run",
        "preview:host",
        "--workspace",
        "@text-comprehend/dashboard",
        "--",
        "--port",
        "4174",
        "--strictPort",
      ],
      expect.any(Object),
    );
    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4174/?source=workspace&workspaceRoot=%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4174/?source=workspace&workspaceRoot=%2Frepo",
    });
  });

  it("kills the preview process when vite preview never becomes ready", async () => {
    const child = createMockChildProcess();
    const spawn = vi.fn().mockReturnValue(child);
    const request = mockHttpRequestSequence(new Array(60).fill(undefined).map(() => ({ error: new Error("connect ECONNREFUSED") })));

    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<typeof import("node:http")>("node:http");
      return { ...actual, request };
    });
    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(result).toEqual({
      status: "launch-failed",
      workspaceRoot: "/repo",
      message: "Failed to launch the dashboard. Try again.",
      detail: expect.stringMatching(/Dashboard preview did not become ready on port 417[3-5]\./),
    });
  }, 10000);

  it("kills the preview process tree on Windows", async () => {
    const child = createMockChildProcess();
    const taskkillChild = createMockChildProcess();
    const originalPlatform = process.platform;
    const request = mockHttpRequestSequence(
      new Array(60).fill(undefined).map(() => ({ error: new Error("connect ECONNREFUSED") })),
    );
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "win32",
    });

    const spawn = vi.fn().mockImplementation((command?: string) => {
      if (command === "taskkill") {
        taskkillChild.unref = vi.fn();
        return taskkillChild;
      }

      return child;
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
    });
    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<typeof import("node:http")>("node:http");
      return { ...actual, request };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    try {
      const result = await launch({ workspaceRoot: "/repo" });

      expect(result).toEqual({
        status: "launch-failed",
        workspaceRoot: "/repo",
        message: "Failed to launch the dashboard. Try again.",
        detail: expect.stringMatching(/Dashboard preview did not become ready on port 417[3-5]\./),
      });

      expect(spawn).toHaveBeenCalledWith(
        "taskkill",
        ["/pid", "1234", "/t", "/f"],
        expect.objectContaining({ stdio: "ignore" }),
      );
      expect(taskkillChild.unref).toHaveBeenCalledTimes(1);
      expect(child.kill).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process, "platform", {
        configurable: true,
        value: originalPlatform,
      });
    }
  }, 10000);

  it("retries the next port when vite preview exits while the requested port is already occupied", async () => {
    const firstChild = createMockChildProcess();
    const secondChild = createMockChildProcess();
    const request = mockHttpRequestSequence([
      { error: new Error("connect ECONNREFUSED") },
      { error: new Error("connect ECONNREFUSED") },
      { statusCode: 200, body: JSON.stringify({ status: "ready", workspaceRoot: "/other-repo" }) },
      { statusCode: 200, body: JSON.stringify({ status: "ready", workspaceRoot: "/repo" }) },
    ]);

    const spawn = vi.fn().mockImplementation((_command: string, args: string[]) => {
      const port = args[args.length - 1];

      if (port === "4173") {
        queueMicrotask(() => {
          firstChild.exitCode = 1;
          firstChild.emit("exit", 1, null);
        });

        return firstChild;
      }

      queueMicrotask(() => {
        secondChild.stdout.emit("data", Buffer.from("  Local:   http://127.0.0.1:4174/\n"));
      });

      return secondChild;
    });

    vi.doMock("node:http", async () => {
      const actual = await vi.importActual<typeof import("node:http")>("node:http");
      return { ...actual, request };
    });
    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return { ...actual, spawn };
    });

    const { createDashboardLauncher: createDashboardLauncherWithDefaults } = await import("./launch-dashboard.js");
    const launch = createDashboardLauncherWithDefaults({
      fileExists: vi.fn().mockResolvedValue(true),
      runBuild: vi.fn().mockResolvedValue(undefined),
    });

    const result = await launch({ workspaceRoot: "/repo" });

    expect(spawn).toHaveBeenNthCalledWith(
      1,
      getNpmCommandForTest(),
      [
        "run",
        "preview:host",
        "--workspace",
        "@text-comprehend/dashboard",
        "--",
        "--port",
        "4173",
        "--strictPort",
      ],
      expect.any(Object),
    );
    expect(spawn).toHaveBeenNthCalledWith(
      2,
      getNpmCommandForTest(),
      [
        "run",
        "preview:host",
        "--workspace",
        "@text-comprehend/dashboard",
        "--",
        "--port",
        "4174",
        "--strictPort",
      ],
      expect.any(Object),
    );
    expect(result).toEqual({
      status: "ready",
      workspaceRoot: "/repo",
      url: "http://127.0.0.1:4174/?source=workspace&workspaceRoot=%2Frepo",
      message: "Dashboard ready: http://127.0.0.1:4174/?source=workspace&workspaceRoot=%2Frepo",
    });
  });

  it("treats a cached responder for another workspace as stale and starts a new server", async () => {
    const fileExists = vi.fn().mockResolvedValue(true);
    const runBuild = vi.fn().mockResolvedValue(undefined);
    const startPreviewServer = vi.fn().mockResolvedValue(undefined);
    const isPreviewServerRunning = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    const launch = createDashboardLauncher({
      fileExists,
      runBuild,
      startPreviewServer,
      isPreviewServerRunning,
    });

    await launch({ workspaceRoot: "/repo-one" });
    const secondResult = await launch({ workspaceRoot: "/repo-two" });

    expect(secondResult).toEqual({
      status: "ready",
      workspaceRoot: "/repo-two",
      url: "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-two",
      message: "Dashboard ready: http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo-two",
    });
    expect(startPreviewServer).toHaveBeenNthCalledWith(1, 4173, "/repo-one");
    expect(startPreviewServer).toHaveBeenNthCalledWith(2, 4173, "/repo-two");
    expect(startPreviewServer).toHaveBeenCalledTimes(2);
  });

});
