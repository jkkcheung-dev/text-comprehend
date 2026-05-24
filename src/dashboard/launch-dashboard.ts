import { access, realpath } from "node:fs/promises";
import { request } from "node:http";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

export type DashboardLaunchResult =
  | {
      status: "ready";
      workspaceRoot: string;
      url: string;
      message: string;
    }
  | {
      status: "missing-analysis-output";
      workspaceRoot: string;
      message: string;
    }
  | {
      status: "launch-failed";
      workspaceRoot: string;
      message: string;
      detail?: string;
    };

export interface LaunchDashboardOptions {
  workspaceRoot: string;
  artifactsExist: (workspaceRoot: string) => Promise<boolean>;
  ensureDashboardBuild: () => Promise<void>;
  startDashboardServer: (workspaceRoot: string, port: number) => Promise<{ url: string }>;
}

export interface DashboardLauncherDependencies {
  fileExists: (filePath: string) => Promise<boolean>;
  runBuild: (args: string[]) => Promise<void>;
  startPreviewServer: (port: number, workspaceRoot: string) => Promise<void>;
  isPreviewServerRunning: (url: string) => Promise<boolean>;
  stopPreviewServer: (workspaceRoot: string) => void;
  resolveWorkspaceRoot: (workspaceRoot: string) => Promise<string>;
}

type DashboardLauncherDependencyOverrides = Partial<DashboardLauncherDependencies>;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const activeDashboardServers = new Map<string, { url: string; child?: ChildProcess }>();
const previewHealthPath = "/__text-comprehend-health__";

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(getNpmCommand(), args, {
      cwd: repositoryRoot,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("exit", (code: number | null) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`npm ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

function createPortInUseError(detail: string): Error & { code: "EADDRINUSE" } {
  const error = new Error(detail) as Error & { code: "EADDRINUSE" };
  error.code = "EADDRINUSE";
  return error;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

type PreviewServerHealth = {
  status: "ready";
  workspaceRoot: string | null;
};

function terminatePreviewProcess(child: ChildProcess): void {
  if (child.pid && process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
      }).unref();
      return;
    } catch {
      // Fall back to killing the direct child below.
    }
  }

  if (child.pid && process.platform !== "win32") {
    try {
      process.kill(-child.pid, "SIGTERM");
      return;
    } catch {
      // Fall back to killing the direct child below.
    }
  }

  try {
    child.disconnect?.();
  } catch {
    // Best-effort cleanup only.
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // Best-effort cleanup only.
  }
}

function createWorkspaceMismatchError(port: number, actualWorkspaceRoot: string | null, expectedWorkspaceRoot: string): Error {
  return new Error(
    `Dashboard preview on port ${port} is serving ${actualWorkspaceRoot ?? "an unknown workspace"} instead of ${expectedWorkspaceRoot}.`,
  );
}

function getPreviewHealthUrl(port: number): string {
  return `http://127.0.0.1:${port}${previewHealthPath}`;
}

async function requestPreviewHealth(url: string): Promise<PreviewServerHealth | undefined> {
  return new Promise<PreviewServerHealth | undefined>((resolvePromise) => {
    const req = request(url, { method: "GET" }, (response) => {
      const chunks: Buffer[] = [];

      response.on("data", (chunk: string | Buffer) => {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          resolvePromise(undefined);
          return;
        }

        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Partial<PreviewServerHealth>;
          if (parsed.status !== "ready") {
            resolvePromise(undefined);
            return;
          }

          resolvePromise({
            status: "ready",
            workspaceRoot: typeof parsed.workspaceRoot === "string" ? parsed.workspaceRoot : null,
          });
        } catch {
          resolvePromise(undefined);
        }
      });
    });

    req.setTimeout(1000, () => {
      req.destroy(new Error("Request timed out"));
    });
    req.once("error", () => {
      resolvePromise(undefined);
    });
    req.end();
  });
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolvePromise) => {
    const server = createNetServer();

    server.once("error", (error: NodeJS.ErrnoException) => {
      resolvePromise(error.code !== "EADDRINUSE");
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => {
        resolvePromise(true);
      });
    });
  });
}

async function getPortStartupError(port: number, workspaceRoot: string): Promise<Error | undefined> {
  const health = await requestPreviewHealth(getPreviewHealthUrl(port));

  if (health) {
    if (health.workspaceRoot === workspaceRoot) {
      return undefined;
    }

    const error = createWorkspaceMismatchError(port, health.workspaceRoot, workspaceRoot) as Error & { code?: string };
    error.code = "EADDRINUSE";
    return error;
  }

  const portAvailable = await isPortAvailable(port);
  if (!portAvailable) {
    return createPortInUseError(`EADDRINUSE: port ${port} is already in use`);
  }

  return undefined;
}

async function getRunningServerUrlForWorkspace(workspaceRoot: string): Promise<string | undefined> {
  for (const port of [4173, 4174, 4175]) {
    const health = await requestPreviewHealth(getPreviewHealthUrl(port));
    if (health?.workspaceRoot === workspaceRoot) {
      return `http://127.0.0.1:${port}/?source=workspace&workspaceRoot=${encodeURIComponent(workspaceRoot)}`;
    }
  }

  return undefined;
}

async function waitForPreviewServerReady(child: ChildProcess, port: number, workspaceRoot: string): Promise<void> {
  const startedAt = Date.now();

  const childError = new Promise<never>((_resolvePromise, reject) => {
    child.once("error", reject);
  });

  while (Date.now() - startedAt < 5000) {
    await Promise.race([childError, delay(0)]);

    const health = await requestPreviewHealth(getPreviewHealthUrl(port));
    if (health) {
      if (health.workspaceRoot === workspaceRoot) {
        return;
      }

      terminatePreviewProcess(child);

      const error = createWorkspaceMismatchError(port, health.workspaceRoot, workspaceRoot) as Error & { code?: string };
      error.code = "EADDRINUSE";
      throw error;
    }

    if (child.exitCode !== null) {
      const startupError = await getPortStartupError(port, workspaceRoot);
      if (startupError) {
        throw startupError;
      }

      const runningServerUrl = await getRunningServerUrlForWorkspace(workspaceRoot);
      if (runningServerUrl) {
        activeDashboardServers.set(workspaceRoot, { url: runningServerUrl });
        return;
      }

      throw new Error(`Dashboard preview exited before becoming ready (code ${child.exitCode ?? "unknown"}).`);
    }

    await delay(100);
  }

  terminatePreviewProcess(child);
  throw new Error(`Dashboard preview did not become ready on port ${port}.`);
}

async function defaultFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function defaultRunBuild(args: string[]): Promise<void> {
  await runCommand(args);
}

async function defaultResolveWorkspaceRoot(workspaceRoot: string): Promise<string> {
  try {
    return await realpath(workspaceRoot);
  } catch {
    return workspaceRoot;
  }
}

async function defaultIsPreviewServerRunning(url: string): Promise<boolean> {
  const serverUrl = new URL(url);
  const expectedWorkspaceRoot = serverUrl.searchParams.get("workspaceRoot");
  const health = await requestPreviewHealth(new URL(previewHealthPath, serverUrl).toString());

  if (!health) {
    return false;
  }

  if (expectedWorkspaceRoot && health.workspaceRoot !== expectedWorkspaceRoot) {
    return false;
  }

  return true;
}

async function defaultStartPreviewServer(port: number, workspaceRoot: string): Promise<void> {
  const child = spawn(
    getNpmCommand(),
    ["run", "preview:host", "--workspace", "@text-comprehend/dashboard", "--", "--port", String(port), "--strictPort"],
    {
      cwd: repositoryRoot,
      detached: true,
      env: {
        ...process.env,
        TEXT_COMPREHEND_DASHBOARD_WORKSPACE_ROOT: workspaceRoot,
      },
      stdio: "ignore",
    },
  );
  child.unref();

  await waitForPreviewServerReady(child, port, workspaceRoot);

  activeDashboardServers.set(workspaceRoot, {
    url: `http://127.0.0.1:${port}/?source=workspace&workspaceRoot=${encodeURIComponent(workspaceRoot)}`,
    child,
  });
}

function defaultStopPreviewServer(workspaceRoot: string): void {
  const activeServer = activeDashboardServers.get(workspaceRoot);
  if (!activeServer?.child) {
    activeDashboardServers.delete(workspaceRoot);
    return;
  }

  terminatePreviewProcess(activeServer.child);
  activeDashboardServers.delete(workspaceRoot);
}

function createLaunchFailure(
  workspaceRoot: string,
  message: string,
  detail?: string,
): DashboardLaunchResult {
  return {
    status: "launch-failed",
    workspaceRoot,
    message,
    detail,
  };
}

export function createDashboardLauncher(
  dependencies: DashboardLauncherDependencyOverrides = {},
): (options: { workspaceRoot: string }) => Promise<DashboardLaunchResult> {
  const resolvedDependencies: DashboardLauncherDependencies = {
    fileExists: dependencies.fileExists ?? defaultFileExists,
    runBuild: dependencies.runBuild ?? defaultRunBuild,
    startPreviewServer: dependencies.startPreviewServer ?? defaultStartPreviewServer,
    isPreviewServerRunning: dependencies.isPreviewServerRunning ?? defaultIsPreviewServerRunning,
    stopPreviewServer: dependencies.stopPreviewServer ?? defaultStopPreviewServer,
    resolveWorkspaceRoot: dependencies.resolveWorkspaceRoot ?? defaultResolveWorkspaceRoot,
  };

  return async ({ workspaceRoot }) => {
    const canonicalWorkspaceRoot = await resolvedDependencies.resolveWorkspaceRoot(workspaceRoot);
    const artifactsExist = await resolvedDependencies.fileExists(
      join(canonicalWorkspaceRoot, ".text-comprehend", "knowledge-graph.json"),
    );

    if (!artifactsExist) {
      resolvedDependencies.stopPreviewServer(canonicalWorkspaceRoot);
      activeDashboardServers.delete(canonicalWorkspaceRoot);
      return {
        status: "missing-analysis-output",
        workspaceRoot,
        message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
      };
    }

    const activeServer = activeDashboardServers.get(canonicalWorkspaceRoot);
    if (activeServer) {
      const isRunning = await resolvedDependencies.isPreviewServerRunning(activeServer.url);

      if (isRunning) {
        return {
          status: "ready",
          workspaceRoot,
          url: activeServer.url,
          message: `Dashboard ready: ${activeServer.url}`,
        };
      }

      resolvedDependencies.stopPreviewServer(canonicalWorkspaceRoot);
      activeDashboardServers.delete(canonicalWorkspaceRoot);
    }

    const result = await launchDashboard({
      workspaceRoot: canonicalWorkspaceRoot,
      artifactsExist: () => Promise.resolve(artifactsExist),
      ensureDashboardBuild: () =>
        resolvedDependencies.runBuild(["run", "build", "--workspace", "@text-comprehend/dashboard"]),
      startDashboardServer: async (targetWorkspaceRoot, port) => {
        await resolvedDependencies.startPreviewServer(port, targetWorkspaceRoot);

        return {
          url: `http://127.0.0.1:${port}/?source=workspace&workspaceRoot=${encodeURIComponent(targetWorkspaceRoot)}`,
        };
      },
    });

    if (result.status === "ready") {
      const activeServer = activeDashboardServers.get(canonicalWorkspaceRoot);
      activeDashboardServers.set(canonicalWorkspaceRoot, { url: result.url, child: activeServer?.child });
      return {
        ...result,
        workspaceRoot,
      };
    }

    return {
      ...result,
      workspaceRoot,
    };
  };
}

export const launchDashboardWithDefaults = createDashboardLauncher();

export async function launchDashboard(options: LaunchDashboardOptions): Promise<DashboardLaunchResult> {
  const hasArtifacts = await options.artifactsExist(options.workspaceRoot);

  if (!hasArtifacts) {
    return {
      status: "missing-analysis-output",
      workspaceRoot: options.workspaceRoot,
      message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    };
  }

  try {
    await options.ensureDashboardBuild();
  } catch (error) {
    return createLaunchFailure(
      options.workspaceRoot,
      "Failed to prepare the dashboard. Try again after fixing the dashboard build.",
      error instanceof Error ? error.message : undefined,
    );
  }

  let lastError: unknown;

  for (const port of [4173, 4174, 4175]) {
    try {
      const server = await options.startDashboardServer(options.workspaceRoot, port);

      return {
        status: "ready",
        workspaceRoot: options.workspaceRoot,
        url: server.url,
        message: `Dashboard ready: ${server.url}`,
      };
    } catch (error) {
      lastError = error;

      const errorCode = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      const isPortInUse =
        errorCode === "EADDRINUSE" || (error instanceof Error && error.message.includes("EADDRINUSE"));

      if (!isPortInUse) {
        break;
      }
    }
  }

  return createLaunchFailure(
    options.workspaceRoot,
    "Failed to launch the dashboard. Try again.",
    lastError instanceof Error ? lastError.message : undefined,
  );
}
