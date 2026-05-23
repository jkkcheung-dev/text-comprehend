import { access } from "node:fs/promises";
import { request } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fork, spawn, type ChildProcess } from "node:child_process";
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
}

type DashboardLauncherDependencyOverrides = Partial<DashboardLauncherDependencies>;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const staticServerPath = resolve(dirname(fileURLToPath(import.meta.url)), "./static-server.cjs");
const activeDashboardServers = new Map<string, { url: string }>();

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

type StaticServerReadyMessage = {
  type: "ready";
};

type StaticServerErrorMessage = {
  type: "error";
  detail: string;
  code?: string;
};

type StaticServerMessage = StaticServerReadyMessage | StaticServerErrorMessage;

function terminateStaticServer(child: ChildProcess): void {
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

async function waitForStaticServerReady(child: ChildProcess, port: number): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      terminateStaticServer(child);
      reject(new Error(`Dashboard preview did not become ready on port ${port}.`));
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeout);
      child.off("message", onMessage);
      child.off("exit", onExit);
      child.off("error", onError);
    };

    const onMessage = (message: StaticServerMessage) => {
      if (!message || typeof message !== "object" || !("type" in message)) {
        return;
      }

      if (message.type === "ready") {
        cleanup();
        try {
          child.disconnect?.();
        } catch {
          // Ignore disconnect cleanup failures.
        }
        resolvePromise();
        return;
      }

      cleanup();
      if (message.code === "EADDRINUSE") {
        reject(createPortInUseError(message.detail));
        return;
      }

      reject(new Error(message.detail));
    };

    const onExit = (code: number | null) => {
      cleanup();
      reject(new Error(`Dashboard preview exited before becoming ready (code ${code ?? "unknown"}).`));
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    child.on("message", onMessage);
    child.once("exit", onExit);
    child.once("error", onError);
  });
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

async function defaultIsPreviewServerRunning(url: string): Promise<boolean> {
  return new Promise<boolean>((resolvePromise) => {
    const req = request(url, { method: "HEAD" }, (response) => {
      response.resume();
      resolvePromise((response.statusCode ?? 500) < 500);
    });

    req.setTimeout(1000, () => {
      req.destroy(new Error("Request timed out"));
    });
    req.once("error", () => {
      resolvePromise(false);
    });
    req.end();
  });
}

async function defaultStartPreviewServer(port: number, workspaceRoot: string): Promise<void> {
  const child = fork(
    staticServerPath,
    [String(port), workspaceRoot],
    {
      cwd: repositoryRoot,
      detached: true,
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  child.unref();

  await waitForStaticServerReady(child, port);
}

export function createDashboardLauncher(
  dependencies: DashboardLauncherDependencyOverrides = {},
): (options: { workspaceRoot: string }) => Promise<DashboardLaunchResult> {
  const resolvedDependencies: DashboardLauncherDependencies = {
    fileExists: dependencies.fileExists ?? defaultFileExists,
    runBuild: dependencies.runBuild ?? defaultRunBuild,
    startPreviewServer: dependencies.startPreviewServer ?? defaultStartPreviewServer,
    isPreviewServerRunning: dependencies.isPreviewServerRunning ?? defaultIsPreviewServerRunning,
  };

  return async ({ workspaceRoot }) => {
    const activeServer = activeDashboardServers.get(workspaceRoot);
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

      activeDashboardServers.delete(workspaceRoot);
    }

    const result = await launchDashboard({
      workspaceRoot,
      artifactsExist: (targetWorkspaceRoot) =>
        resolvedDependencies.fileExists(join(targetWorkspaceRoot, ".text-comprehend", "knowledge-graph.json")),
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
      activeDashboardServers.set(workspaceRoot, { url: result.url });
    }

    return result;
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

    return {
      status: "launch-failed",
      workspaceRoot: options.workspaceRoot,
      message: "Failed to launch the dashboard.",
      detail: lastError instanceof Error ? lastError.message : undefined,
    };
  } catch (error) {
    return {
      status: "launch-failed",
      workspaceRoot: options.workspaceRoot,
      message: "Failed to launch the dashboard.",
      detail: error instanceof Error ? error.message : undefined,
    };
  }
}
