import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const dashboardFixtureGraphPath = fileURLToPath(
  new URL("../../../../tests/fixtures/dashboard-workspace/.text-comprehend/knowledge-graph.json", import.meta.url),
);

type CapturedMiddleware = (
  request: { url?: string },
  response: {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    end: (body: string) => void;
  },
  next: () => void,
) => void | Promise<void>;

function getDashboardFixturesPlugin(config: unknown) {
  const plugins =
    config && typeof config === "object" && "plugins" in config && Array.isArray(config.plugins) ? config.plugins : [];

  return plugins.find(
    (plugin): plugin is { name: string; configureServer?: (server: { middlewares: { use: (middleware: CapturedMiddleware) => void } }) => void; configurePreviewServer?: (server: { middlewares: { use: (middleware: CapturedMiddleware) => void } }) => void } =>
      Boolean(plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "dashboard-fixtures"),
  );
}

function captureMiddleware(register: ((server: { middlewares: { use: (middleware: CapturedMiddleware) => void } }) => void) | undefined) {
  let middleware: CapturedMiddleware | undefined;

  register?.({
    middlewares: {
      use(nextMiddleware) {
        middleware = nextMiddleware;
      },
    },
  });

  if (!middleware) {
    throw new Error("dashboard fixture middleware was not registered");
  }

  return middleware;
}

async function runMiddleware(middleware: CapturedMiddleware, url: string) {
  let body = "";
  const headers = new Map<string, string>();
  let nextCalled = false;

  await middleware(
    { url },
    {
      statusCode: 0,
      setHeader(name, value) {
        headers.set(name, value);
      },
      end(nextBody) {
        body = nextBody;
      },
    },
    () => {
      nextCalled = true;
    },
  );

  return { body, headers, nextCalled };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fixture-backed dashboard bootstrap wiring", () => {
  it("reads fixture artifacts from the Vite fixture route", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "fixture contents",
    });

    vi.stubGlobal("fetch", fetch);

    const { createFixtureSource } = await import("./create-fixture-source");
    const source = createFixtureSource("dashboard-workspace");

    await expect(source.read(".text-comprehend/knowledge-graph.json")).resolves.toBe("fixture contents");
    expect(fetch).toHaveBeenCalledWith(
      "/__text-comprehend-fixtures__/dashboard-workspace/.text-comprehend/knowledge-graph.json",
    );
  });

  it("returns fixture source metadata", async () => {
    const { createFixtureSource } = await import("./create-fixture-source");
    const source = createFixtureSource("dashboard-workspace");

    expect(source.meta).toEqual({
      mode: "fixture",
      label: "Fixture: dashboard-workspace",
      fixtureName: "dashboard-workspace",
    });
  });

  it("surfaces the requested artifact path when a fixture read fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    const { createFixtureSource } = await import("./create-fixture-source");
    const source = createFixtureSource("dashboard-workspace");

    await expect(source.read(".text-comprehend/missing.json")).rejects.toThrow(
      "ENOENT: .text-comprehend/missing.json",
    );
  });

  it("reads workspace artifacts through the workspace route", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "workspace contents",
    });

    vi.stubGlobal("fetch", fetch);

    const workspaceRoot = fileURLToPath(new URL("../../../../tests/fixtures/dashboard-workspace/", import.meta.url));
    const { createWorkspaceSource } = await import("./create-workspace-source");
    const source = createWorkspaceSource(workspaceRoot);

    await expect(source.read(".text-comprehend/knowledge-graph.json")).resolves.toBe("workspace contents");
    expect(source.meta).toEqual({
      mode: "workspace",
      label: `Workspace: ${workspaceRoot}`,
      workspaceRoot,
    });
    expect(fetch).toHaveBeenCalledWith(
      `/__text-comprehend-workspace__/${encodeURIComponent(workspaceRoot)}/.text-comprehend/knowledge-graph.json`,
    );
  });

  it("defines a Vite config for serving checked-in fixtures", async () => {
    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);

    expect(plugin).toBeDefined();
  });

  it("registers the fixture middleware for vite preview", async () => {
    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);

    expect(plugin?.configurePreviewServer).toEqual(expect.any(Function));
  });

  it("does not alias core package imports to dashboard source paths", async () => {
    const { default: config } = await import("../../vite.config");

    expect(config.resolve?.alias).not.toMatchObject({
      "@text-comprehend/core/schemas": expect.any(String),
    });
  });

  it("serves dashboard fixture files from the preview middleware", async () => {
    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);
    const middleware = captureMiddleware(plugin?.configurePreviewServer);
    const expected = await readFile(dashboardFixtureGraphPath, "utf-8");

    const result = await runMiddleware(
      middleware,
      "/__text-comprehend-fixtures__/dashboard-workspace/.text-comprehend/knowledge-graph.json",
    );

    expect(result.nextCalled).toBe(false);
    expect(result.body).toBe(expected);
    expect(result.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("serves workspace graph files from the preview middleware", async () => {
    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);
    const middleware = captureMiddleware(plugin?.configurePreviewServer);
    const workspaceRoot = fileURLToPath(new URL("../../../../tests/fixtures/dashboard-workspace/", import.meta.url));
    const expected = await readFile(dashboardFixtureGraphPath, "utf-8");

    const result = await runMiddleware(
      middleware,
      `/__text-comprehend-workspace__/${encodeURIComponent(workspaceRoot)}/.text-comprehend/knowledge-graph.json`,
    );

    expect(result.nextCalled).toBe(false);
    expect(result.body).toBe(expected);
    expect(result.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("reports launched preview health and enforces the configured workspace root", async () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../tests/fixtures/dashboard-workspace/", import.meta.url));
    const canonicalWorkspaceRoot = await realpath(workspaceRoot);

    vi.stubEnv("TEXT_COMPREHEND_DASHBOARD_WORKSPACE_ROOT", workspaceRoot);

    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);
    const middleware = captureMiddleware(plugin?.configurePreviewServer);

    const healthResult = await runMiddleware(middleware, "/__text-comprehend-health__");
    const allowedResult = await runMiddleware(
      middleware,
      `/__text-comprehend-workspace__/${encodeURIComponent(workspaceRoot)}/.text-comprehend/knowledge-graph.json`,
    );
    const rejectedResult = await runMiddleware(
      middleware,
      "/__text-comprehend-workspace__/%2Fanother-workspace/.text-comprehend/knowledge-graph.json",
    );

    expect(healthResult.nextCalled).toBe(false);
    expect(healthResult.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(JSON.parse(healthResult.body)).toEqual({
      status: "ready",
      workspaceRoot: canonicalWorkspaceRoot,
    });

    expect(allowedResult.nextCalled).toBe(false);
    expect(allowedResult.body).not.toBe("Not Found");

    expect(rejectedResult.nextCalled).toBe(false);
    expect(rejectedResult.body).toBe("Not Found");
  });

  it("treats canonical-equivalent configured workspace roots as the same workspace identity", async () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../tests/fixtures/dashboard-workspace/", import.meta.url));
    const canonicalWorkspaceRoot = await realpath(workspaceRoot);
    const aliasWorkspaceRoot = `${workspaceRoot.replace(/\/$/, "")}/../dashboard-workspace/`;

    vi.stubEnv("TEXT_COMPREHEND_DASHBOARD_WORKSPACE_ROOT", aliasWorkspaceRoot);

    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);
    const middleware = captureMiddleware(plugin?.configurePreviewServer);

    const healthResult = await runMiddleware(middleware, "/__text-comprehend-health__");
    const allowedResult = await runMiddleware(
      middleware,
      `/__text-comprehend-workspace__/${encodeURIComponent(workspaceRoot)}/.text-comprehend/knowledge-graph.json`,
    );

    expect(JSON.parse(healthResult.body)).toEqual({
      status: "ready",
      workspaceRoot: canonicalWorkspaceRoot,
    });
    expect(allowedResult.nextCalled).toBe(false);
    expect(allowedResult.body).not.toBe("Not Found");
  });

  it("does not expose sibling fixture trees through the dashboard route", async () => {
    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);
    const middleware = captureMiddleware(plugin?.configureServer);

    const result = await runMiddleware(middleware, "/__text-comprehend-fixtures__/sample-corpus/doc-1.md");

    expect(result.nextCalled).toBe(false);
    expect(result.body).toBe("Not Found");
  });

  it("blocks workspace reads outside .text-comprehend", async () => {
    const { default: config } = await import("../../vite.config");
    const plugin = getDashboardFixturesPlugin(config);
    const middleware = captureMiddleware(plugin?.configureServer);
    const workspaceRoot = fileURLToPath(new URL("../../../../tests/fixtures/dashboard-workspace/", import.meta.url));

    const result = await runMiddleware(
      middleware,
      `/__text-comprehend-workspace__/${encodeURIComponent(workspaceRoot)}/../package.json`,
    );

    expect(result.nextCalled).toBe(false);
    expect(result.body).toBe("Not Found");
  });

  it("blocks workspace symlink escapes outside .text-comprehend", async () => {
    const workspaceRoot = await mkdtemp(join(process.cwd(), "tmp-dashboard-workspace-"));
    const artifactsRoot = join(workspaceRoot, ".text-comprehend");
    const outsideDir = join(workspaceRoot, "outside");
    const outsideFile = join(outsideDir, "secret.txt");
    const symlinkPath = join(artifactsRoot, "linked-secret.txt");

    await mkdir(artifactsRoot, { recursive: true });
    await mkdir(outsideDir, { recursive: true });
    await writeFile(outsideFile, "secret", "utf-8");
    await symlink(outsideFile, symlinkPath);

    try {
      const { default: config } = await import("../../vite.config");
      const plugin = getDashboardFixturesPlugin(config);
      const middleware = captureMiddleware(plugin?.configureServer);

      const result = await runMiddleware(
        middleware,
        `/__text-comprehend-workspace__/${encodeURIComponent(workspaceRoot)}/.text-comprehend/linked-secret.txt`,
      );

      expect(result.nextCalled).toBe(false);
      expect(result.body).toBe("Not Found");
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
