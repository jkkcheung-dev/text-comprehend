const { createServer } = require("node:http");
const { readFile, realpath } = require("node:fs/promises");
const { extname, isAbsolute, join, normalize, relative, resolve } = require("node:path");

const distRoot = resolve(__dirname, "../../packages/dashboard/dist");
const port = Number(process.argv[2] ?? "4173");
const workspaceRoot = process.argv[3] ?? "";
const workspaceRoutePrefix = "/__text-comprehend-workspace__/";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendMessage(message) {
  if (typeof process.send === "function") {
    process.send(message);
  }
}

function isWithinRoot(root, path) {
  const relativePath = relative(root, path);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath)
    || relativePath === "";
}

function resolveFilePath(urlPathname) {
  const pathname = urlPathname === "/" ? "/index.html" : urlPathname;
  const candidate = resolve(distRoot, `.${normalize(pathname)}`);

  if (!isWithinRoot(distRoot, candidate)) {
    return null;
  }

  return candidate;
}

async function tryHandleWorkspaceRequest(requestUrl, response) {
  if (!requestUrl.pathname.startsWith(workspaceRoutePrefix)) {
    return false;
  }

  const trimmed = requestUrl.pathname.slice(workspaceRoutePrefix.length);
  const slashIndex = trimmed.indexOf("/");

  if (slashIndex === -1) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  const requestedWorkspaceRoot = decodeURIComponent(trimmed.slice(0, slashIndex));
  const relativeArtifactPath = trimmed.slice(slashIndex + 1);

  if (requestedWorkspaceRoot !== workspaceRoot || !relativeArtifactPath.startsWith(".text-comprehend/")) {
    response.statusCode = 404;
    response.end("Not Found");
    return true;
  }

  const workspaceArtifactsRoot = resolve(workspaceRoot, ".text-comprehend");
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

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

    if (await tryHandleWorkspaceRequest(requestUrl, response)) {
      return;
    }

    let filePath = resolveFilePath(requestUrl.pathname);

    if (!filePath) {
      response.statusCode = 404;
      response.end("Not Found");
      return;
    }

    try {
      const content = await readFile(filePath);
      const extension = extname(filePath);
      response.statusCode = 200;
      response.setHeader("Content-Type", contentTypes[extension] ?? "application/octet-stream");
      response.end(content);
      return;
    } catch {
      filePath = join(distRoot, "index.html");
      const content = await readFile(filePath);
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(content);
    }
  } catch {
    response.statusCode = 500;
    response.end("Internal Server Error");
  }
});

server.once("listening", () => {
  sendMessage({ type: "ready" });
});

server.once("error", (error) => {
  sendMessage({
    type: "error",
    code: error && typeof error === "object" && "code" in error ? error.code : undefined,
    detail: error instanceof Error ? error.message : "Static server failed to start.",
  });
  process.exit(1);
});

process.once("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});

server.listen(port, "127.0.0.1");
