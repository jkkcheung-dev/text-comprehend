import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const FIXTURE_ROUTE_PREFIX = "/__text-comprehend-fixtures__/";
const WORKSPACE_ROUTE_PREFIX = "/__text-comprehend-workspace__/";
const HEALTH_ROUTE = "/__text-comprehend-health__";
const dashboardFixtureName = "dashboard-workspace";
const fixtureRoot = resolve(__dirname, "../../tests/fixtures/dashboard-workspace");

function getConfiguredWorkspaceRoot(): string | null {
  return process.env.TEXT_COMPREHEND_DASHBOARD_WORKSPACE_ROOT ?? null;
}

async function canonicalizeWorkspaceRoot(workspaceRoot: string | null): Promise<string | null> {
  if (!workspaceRoot) {
    return null;
  }

  try {
    return await realpath(workspaceRoot);
  } catch {
    return resolve(workspaceRoot);
  }
}

type FixtureRequest = {
  url?: string;
};

type FixtureResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
};

type FixtureMiddleware = (request: FixtureRequest, response: FixtureResponse, next: () => void) => void | Promise<void>;

type FixtureServer = {
  middlewares: {
    use(middleware: FixtureMiddleware): void;
  };
};

function isWithinRoot(root: string, path: string): boolean {
  const relativePath = relative(root, path);
  return !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

async function handleFixtureRequest(url: string, response: FixtureResponse): Promise<boolean> {
  if (!url.startsWith(FIXTURE_ROUTE_PREFIX)) {
    return false;
  }

  const fixturePath = decodeURIComponent(url.slice(FIXTURE_ROUTE_PREFIX.length));

  if (!fixturePath.startsWith(`${dashboardFixtureName}/`)) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  const relativeFixturePath = fixturePath.slice(dashboardFixtureName.length + 1);
  const filePath = resolve(fixtureRoot, relativeFixturePath);

  if (!isWithinRoot(fixtureRoot, filePath)) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  try {
    const content = await readFile(filePath, "utf-8");
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(content);
  } catch {
    response.statusCode = 404;
    response.end("Not Found");
  }

  return true;
}

async function handleWorkspaceRequest(url: string, response: FixtureResponse): Promise<boolean> {
  if (!url.startsWith(WORKSPACE_ROUTE_PREFIX)) {
    return false;
  }

  const trimmed = url.slice(WORKSPACE_ROUTE_PREFIX.length);
  const slashIndex = trimmed.indexOf("/");

  if (slashIndex === -1) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  const requestedWorkspaceRoot = decodeURIComponent(trimmed.slice(0, slashIndex));
  const relativeArtifactPath = trimmed.slice(slashIndex + 1);
  const [canonicalWorkspaceRoot, configuredWorkspaceRoot] = await Promise.all([
    canonicalizeWorkspaceRoot(requestedWorkspaceRoot),
    canonicalizeWorkspaceRoot(getConfiguredWorkspaceRoot()),
  ]);
  const workspaceRoot = canonicalWorkspaceRoot ?? resolve(requestedWorkspaceRoot);

  if (configuredWorkspaceRoot && workspaceRoot !== configuredWorkspaceRoot) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  const workspaceArtifactsRoot = resolve(workspaceRoot, ".text-comprehend");

  if (!relativeArtifactPath.startsWith(".text-comprehend/")) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  const filePath = resolve(workspaceRoot, relativeArtifactPath);

  if (!isWithinRoot(workspaceArtifactsRoot, filePath)) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  try {
    const [realArtifactsRoot, realFilePath] = await Promise.all([
      realpath(workspaceArtifactsRoot),
      realpath(filePath),
    ]);

    if (!isWithinRoot(realArtifactsRoot, realFilePath)) {
      response.statusCode = 404;
      response.end("Not Found");
      return true;
    }

    const content = await readFile(filePath, "utf-8");
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(content);
  } catch {
    response.statusCode = 404;
    response.end("Not Found");
  }

  return true;
}

async function handleHealthRequest(url: string, response: FixtureResponse): Promise<boolean> {
  if (url !== HEALTH_ROUTE) {
    return false;
  }

  const configuredWorkspaceRoot = await canonicalizeWorkspaceRoot(getConfiguredWorkspaceRoot());
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(
    JSON.stringify({
      status: "ready",
      workspaceRoot: configuredWorkspaceRoot,
    }),
  );
  return true;
}

function registerDashboardMiddleware(server: FixtureServer) {
  server.middlewares.use(async (request, response, next) => {
    const url = request.url;

    if (!url) {
      next();
      return;
    }

    if (await handleHealthRequest(url, response)) {
      return;
    }

    if (await handleFixtureRequest(url, response)) {
      return;
    }

    if (await handleWorkspaceRequest(url, response)) {
      return;
    }

    next();
  });
}

function dashboardFixtures(): Plugin {
  return {
    name: "dashboard-fixtures",
    configureServer(server) {
      registerDashboardMiddleware(server);
    },
    configurePreviewServer(server) {
      registerDashboardMiddleware(server);
    },
  };
}

export default defineConfig({
  plugins: [react(), dashboardFixtures()],
});
