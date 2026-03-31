import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(
  __dirname,
  "../../../../../tests/fixtures/sample-corpus",
);

// Dynamic import to make sure the module exists
const { scanDirectory } = await import("../scanner.js");

describe("scanDirectory", () => {
  it("discovers supported text files", async () => {
    const result = await scanDirectory(FIXTURES_DIR);
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
    const result = await scanDirectory(FIXTURES_DIR);
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
    const result = await scanDirectory(FIXTURES_DIR);
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
});
