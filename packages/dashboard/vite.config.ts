import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const FIXTURE_ROUTE_PREFIX = "/__text-comprehend-fixtures__/";
const fixtureRoot = resolve(__dirname, "../../tests/fixtures");

function isWithinFixtureRoot(path: string): boolean {
  const relativePath = relative(fixtureRoot, path);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function dashboardFixtures(): Plugin {
  return {
    name: "dashboard-fixtures",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url;

        if (!url?.startsWith(FIXTURE_ROUTE_PREFIX)) {
          next();
          return;
        }

        const fixturePath = decodeURIComponent(url.slice(FIXTURE_ROUTE_PREFIX.length));
        const filePath = resolve(fixtureRoot, fixturePath);

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
    },
  };
}

export default defineConfig({
  plugins: [react(), dashboardFixtures()],
});
