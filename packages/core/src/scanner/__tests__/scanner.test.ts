import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(
  __dirname,
  "../../../../../tests/fixtures/sample-corpus",
);

// Dynamic import to make sure the module exists
const { scanDirectory } = await import("../scanner.js");

describe("scanDirectory", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "tc-scan-"));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("discovers supported text files", async () => {
    await mkdir(join(tempRoot, "subdir"), { recursive: true });
    await writeFile(join(tempRoot, "doc-1.md"), "# Title\n\nContent.", "utf-8");
    await writeFile(join(tempRoot, "doc-2.txt"), "Content line 1\nContent line 2\n", "utf-8");
    await writeFile(join(tempRoot, "subdir/doc-3.md"), "# Nested\n\nTest.", "utf-8");

    const result = await scanDirectory(tempRoot);
    const paths = result.files.map((f: any) => f.relativePath).sort();

    expect(paths).toContain("doc-1.md");
    expect(paths).toContain("doc-2.txt");
    expect(paths).toContain("subdir/doc-3.md");
  });

  it("skips files matching root .gitignore patterns", async () => {
    const result = await scanDirectory(FIXTURES_DIR);
    const paths = result.files.map((f: any) => f.relativePath);

    expect(paths).not.toContain("ignored-file.log");
  });

  it("skips files matching nested .gitignore patterns", async () => {
    const result = await scanDirectory(FIXTURES_DIR);
    const paths = result.files.map((f: any) => f.relativePath);

    // subdir/.gitignore ignores *.tmp
    expect(paths).not.toContain("subdir/ignored-notes.tmp");
  });

  it("skips unsupported file types", async () => {
    const result = await scanDirectory(FIXTURES_DIR);
    const paths = result.files.map((f: any) => f.relativePath);

    expect(paths).not.toContain(".gitignore");
  });

  it("skips binary document types (pdf, docx) with appropriate reason", async () => {
    await writeFile(join(tempRoot, "report.pdf"), "%PDF-1.4 fake binary content for testing", "utf-8");

    const result = await scanDirectory(tempRoot);
    const paths = result.files.map((f: any) => f.relativePath);

    expect(paths).not.toContain("report.pdf");

    const pdfSkip = result.skipped.find((s) => s.path === "report.pdf");
    expect(pdfSkip).toBeDefined();
    expect(pdfSkip!.reason).toContain("binary document extraction not yet supported");
  });

  it("includes file hash and document ID for each file", async () => {
    const result = await scanDirectory(FIXTURES_DIR);

    for (const file of result.files) {
      expect(file.documentId).toMatch(/^[a-f0-9]{12}$/);
      expect(file.fileHash).toMatch(/^[a-f0-9]{64}$/);
      expect(file.fileType).toBeTruthy();
    }
  });

  it("includes file size estimation", async () => {
    const result = await scanDirectory(FIXTURES_DIR);

    for (const file of result.files) {
      expect(file.sizeBytes).toBeGreaterThan(0);
    }
  });

  it("skips empty files with appropriate reason", async () => {
    await writeFile(join(tempRoot, "empty.md"), "", "utf-8");

    const result = await scanDirectory(tempRoot);
    const paths = result.files.map((f: any) => f.relativePath);

    expect(paths).not.toContain("empty.md");

    const emptySkip = result.skipped.find((s) => s.path === "empty.md");
    expect(emptySkip).toBeDefined();
    expect(emptySkip!.reason).toBe("empty file");
  });

  it("returns scan metadata", async () => {
    const result = await scanDirectory(FIXTURES_DIR);

    expect(result.scannedAt).toBeTruthy();
    expect(result.rootDir).toBe(FIXTURES_DIR);
    expect(result.totalFiles).toBe(result.files.length);
  });

  it("includes supported hidden files while still skipping internal directories", async () => {
    await mkdir(join(tempRoot, ".text-comprehend", "facets", "summaries"), { recursive: true });
    await mkdir(join(tempRoot, ".git"), { recursive: true });
    await mkdir(join(tempRoot, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(tempRoot, ".notes.md"), "# Hidden Notes\n\nKeep me.", "utf-8");
    await writeFile(join(tempRoot, ".text-comprehend", "facets", "summaries", "generated.md"), "generated", "utf-8");
    await writeFile(join(tempRoot, ".git", "config.md"), "ignored", "utf-8");
    await writeFile(join(tempRoot, "node_modules", "pkg", "readme.md"), "ignored", "utf-8");

    const result = await scanDirectory(tempRoot);
    const paths = result.files.map((file: any) => file.relativePath).sort();

    expect(paths).toContain(".notes.md");
    expect(paths).not.toContain(".text-comprehend/facets/summaries/generated.md");
    expect(paths).not.toContain(".git/config.md");
    expect(paths).not.toContain("node_modules/pkg/readme.md");
  });
});
