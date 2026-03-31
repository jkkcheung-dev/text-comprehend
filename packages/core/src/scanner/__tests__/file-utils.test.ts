import { describe, it, expect } from "vitest";
import { computeFileHash, generateDocumentId, isSupportedFileType, isBinaryDocumentType } from "../file-utils.js";

describe("isSupportedFileType", () => {
  it("accepts supported extensions", () => {
    expect(isSupportedFileType("doc.md")).toBe(true);
    expect(isSupportedFileType("doc.txt")).toBe(true);
    expect(isSupportedFileType("doc.pdf")).toBe(true);
    expect(isSupportedFileType("doc.rst")).toBe(true);
    expect(isSupportedFileType("doc.html")).toBe(true);
    expect(isSupportedFileType("doc.docx")).toBe(true);
  });

  it("rejects unsupported extensions", () => {
    expect(isSupportedFileType("image.png")).toBe(false);
    expect(isSupportedFileType("data.json")).toBe(false);
    expect(isSupportedFileType("script.js")).toBe(false);
    expect(isSupportedFileType("noext")).toBe(false);
  });
});

describe("isBinaryDocumentType", () => {
  it("identifies PDF and DOCX as binary document types", () => {
    expect(isBinaryDocumentType("report.pdf")).toBe(true);
    expect(isBinaryDocumentType("report.docx")).toBe(true);
    expect(isBinaryDocumentType("REPORT.PDF")).toBe(true);
    expect(isBinaryDocumentType("REPORT.DOCX")).toBe(true);
  });

  it("does not flag text-based formats as binary", () => {
    expect(isBinaryDocumentType("doc.md")).toBe(false);
    expect(isBinaryDocumentType("doc.txt")).toBe(false);
    expect(isBinaryDocumentType("doc.rst")).toBe(false);
    expect(isBinaryDocumentType("doc.html")).toBe(false);
  });
});

describe("computeFileHash", () => {
  it("returns a consistent SHA-256 hash for the same content", () => {
    const hash1 = computeFileHash("hello world");
    const hash2 = computeFileHash("hello world");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns different hashes for different content", () => {
    const hash1 = computeFileHash("hello");
    const hash2 = computeFileHash("world");
    expect(hash1).not.toBe(hash2);
  });
});

describe("generateDocumentId", () => {
  it("returns first 12 hex chars of SHA-256 of the file path", () => {
    const id = generateDocumentId("docs/example.md");
    expect(id).toMatch(/^[a-f0-9]{12}$/);
  });

  it("returns consistent IDs for the same path", () => {
    const id1 = generateDocumentId("docs/example.md");
    const id2 = generateDocumentId("docs/example.md");
    expect(id1).toBe(id2);
  });

  it("returns different IDs for different paths", () => {
    const id1 = generateDocumentId("docs/a.md");
    const id2 = generateDocumentId("docs/b.md");
    expect(id1).not.toBe(id2);
  });
});
