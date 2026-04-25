import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
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
    const { manifest, wasCorrupt } = await manager.load();
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.files).toEqual({});
    expect(wasCorrupt).toBe(false);
  });

  it("saves and loads a manifest", async () => {
    const manifest: Manifest = {
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {
        "doc.md": {
          documentId: "abc123def456",
          title: "Document Title",
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
    const { manifest: loaded, wasCorrupt } = await manager.load();
    expect(loaded).toEqual(manifest);
    expect(wasCorrupt).toBe(false);
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
          title: "Document Title",
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
          title: "Document Title",
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

  it("detects removed files not present in current scan", () => {
    const manifest: Manifest = {
      version: "1.0.0",
      lastRun: "2026-03-31T00:00:00.000Z",
      files: {
        "doc.md": {
          documentId: "abc123def456",
          title: "Document Title",
          fileHash: "hash1",
          lastAnalyzed: "2026-03-31T00:00:00.000Z",
          facets: {
            summary: { status: "success" },
            concepts: { status: "success" },
            arguments: { status: "success" },
            qa: { status: "success" },
          },
        },
        "deleted.md": {
          documentId: "def456abc789",
          title: "Deleted Document Title",
          fileHash: "hash2",
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

    const removed = manager.getRemovedFiles(manifest, [
      { relativePath: "doc.md", documentId: "abc123def456", fileHash: "hash1", absolutePath: "/x/doc.md", fileType: "md", sizeBytes: 100 },
    ]);

    expect(removed).toEqual(["deleted.md"]);
  });

  it("reports wasCorrupt when manifest file contains invalid JSON", async () => {
    await mkdir(join(tempDir, ".text-comprehend"), { recursive: true });
    await writeFile(
      join(tempDir, ".text-comprehend", "manifest.json"),
      "not valid json {{{",
      "utf-8"
    );

    const { manifest, wasCorrupt } = await manager.load();
    expect(wasCorrupt).toBe(true);
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.files).toEqual({});
  });

  it("reports wasCorrupt when manifest fails schema validation", async () => {
    await mkdir(join(tempDir, ".text-comprehend"), { recursive: true });
    await writeFile(
      join(tempDir, ".text-comprehend", "manifest.json"),
      JSON.stringify({ version: 123, bad: "data" }),
      "utf-8"
    );

    const { manifest, wasCorrupt } = await manager.load();
    expect(wasCorrupt).toBe(true);
    expect(manifest.files).toEqual({});
  });

  it("backfills missing titles when loading a legacy manifest", async () => {
    await mkdir(join(tempDir, ".text-comprehend"), { recursive: true });
    await writeFile(
      join(tempDir, ".text-comprehend", "manifest.json"),
      JSON.stringify({
        version: "1.0.0",
        lastRun: "2026-03-31T00:00:00.000Z",
        files: {
          "docs/legacy-file_name.md": {
            documentId: "legacy-doc",
            fileHash: "legacy-hash",
            lastAnalyzed: "2026-03-31T00:00:00.000Z",
            facets: {
              summary: { status: "success" },
              concepts: { status: "pending" },
              arguments: { status: "pending" },
              qa: { status: "pending" },
            },
          },
        },
      }),
      "utf-8"
    );

    const { manifest, wasCorrupt } = await manager.load();

    expect(wasCorrupt).toBe(false);
    expect(manifest.files["docs/legacy-file_name.md"].title).toBe("legacy file name");
  });
});
