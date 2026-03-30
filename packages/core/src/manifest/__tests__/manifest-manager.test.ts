import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ManifestManager } from "../manifest-manager.js";
import type { Manifest } from "../../schemas/index.js";

describe("ManifestManager", () => {
  let tempDir: string;
  let manager: ManifestManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tc-test-"));
    manager = new ManifestManager(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty manifest when no manifest file exists", async () => {
    const manifest = await manager.load();
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.files).toEqual({});
  });

  it("saves and loads a manifest", async () => {
    const manifest: Manifest = {
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {
        "doc.md": {
          documentId: "abc123def456",
          fileHash: "sha256-abc",
          lastAnalyzed: "2026-03-31T00:00:00.000Z",
          facets: {
            summary: { status: "success" },
            concepts: { status: "success" },
            arguments: { status: "pending" },
            qa: { status: "pending" },
          },
        },
      },
    };

    await manager.save(manifest);
    const loaded = await manager.load();
    expect(loaded).toEqual(manifest);
  });

  it("saves manifest as valid JSON in .text-comprehend/manifest.json", async () => {
    await manager.save({
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {},
    });

    const raw = await readFile(
      join(tempDir, ".text-comprehend", "manifest.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe("1.0.0");
  });

  it("detects changed files by comparing hashes", async () => {
    const oldManifest: Manifest = {
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {
        "doc.md": {
          documentId: "abc123def456",
          fileHash: "oldhash",
          lastAnalyzed: "2026-03-31T00:00:00.000Z",
          facets: {
            summary: { status: "success" },
            concepts: { status: "success" },
            arguments: { status: "success" },
            qa: { status: "success" },
          },
        },
      },
    };

    const changedFiles = manager.getChangedFiles(oldManifest, [
      { relativePath: "doc.md", documentId: "abc123def456", fileHash: "newhash", absolutePath: "/x/doc.md", fileType: "md", sizeBytes: 100 },
      { relativePath: "new.md", documentId: "def456abc789", fileHash: "hash2", absolutePath: "/x/new.md", fileType: "md", sizeBytes: 200 },
    ]);

    expect(changedFiles.map((f) => f.relativePath).sort()).toEqual(["doc.md", "new.md"]);
  });

  it("detects files needing retry when facets failed", async () => {
    const manifest: Manifest = {
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {
        "doc.md": {
          documentId: "abc123def456",
          fileHash: "hash1",
          lastAnalyzed: "2026-03-31T00:00:00.000Z",
          facets: {
            summary: { status: "success" },
            concepts: { status: "failed", error: "timeout" },
            arguments: { status: "success" },
            qa: { status: "success" },
          },
        },
      },
    };

    const retryFiles = manager.getFailedFacets(manifest);
    expect(retryFiles).toEqual([
      { filePath: "doc.md", facets: ["concepts"] },
    ]);
  });
});
