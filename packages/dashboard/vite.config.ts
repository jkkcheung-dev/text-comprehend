import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const FIXTURE_ROUTE_PREFIX = "/__text-comprehend-fixtures__/";
const dashboardFixtureName = "dashboard-workspace";
const fixtureRoot = resolve(__dirname, "../../tests/fixtures/dashboard-workspace");

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

function isWithinFixtureRoot(path: string): boolean {
  const relativePath = relative(fixtureRoot, path);
  return !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function registerFixtureMiddleware(server: FixtureServer) {
  server.middlewares.use(async (request, response, next) => {
    const url = request.url;

    if (!url?.startsWith(FIXTURE_ROUTE_PREFIX)) {
      next();
      return;
    }

    const fixturePath = decodeURIComponent(url.slice(FIXTURE_ROUTE_PREFIX.length));

    if (!fixturePath.startsWith(`${dashboardFixtureName}/`)) {
      response.statusCode = 404;
      response.end("Not Found");
      return;
    }

    const relativeFixturePath = fixturePath.slice(dashboardFixtureName.length + 1);
    const filePath = resolve(fixtureRoot, relativeFixturePath);

    if (!isWithinFixtureRoot(filePath)) {
      response.statusCode = 404;
      response.end("Not Found");
      return;
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
  });
}

function dashboardFixtures(): Plugin {
  return {
    name: "dashboard-fixtures",
    configureServer(server) {
      registerFixtureMiddleware(server);
    },
    configurePreviewServer(server) {
      registerFixtureMiddleware(server);
    },
  };
}

export default defineConfig({
  plugins: [react(), dashboardFixtures()],
});
