import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { reviewKnowledgeGraph } from "../reviewer.js";

describe("reviewKnowledgeGraph", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "tc-review-"));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("writes orphan and invalid source findings as errors", async () => {
    await writeFile(join(rootDir, "doc.md"), "line 1\nline 2\n", "utf-8");

    const report = await reviewKnowledgeGraph({
      rootDir,
      strict: true,
      graph: {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        documents: [
          {
            id: "doc-1",
            filePath: "doc.md",
            title: "Doc",
            fileType: "md",
            lastAnalyzed: new Date().toISOString(),
            fileHash: "hash",
            summary: {
              thesis: "T",
              overview: "O",
              sections: [
                {
                  id: "sec-1",
                  heading: "Section",
                  summary: "S",
                  keyPoints: ["K"],
                  sourceRange: { documentId: "doc-1", startLine: 10, endLine: 12, excerpt: "missing" },
                },
              ],
            },
            concepts: [],
            arguments: [],
            questions: [],
          },
        ],
        edges: [],
      },
      manifestFiles: {},
    });

    expect(report.summary.errors).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.code === "ORPHAN_NODE")).toBe(true);
    expect(report.findings.some((finding) => finding.code === "INVALID_SOURCE_RANGE")).toBe(true);

    const persisted = JSON.parse(await readFile(join(rootDir, ".text-comprehend", "review-report.json"), "utf-8"));
    expect(persisted.summary.errors).toBe(report.summary.errors);
  });

  it("flags blank successful summaries as low-confidence warnings", async () => {
    await writeFile(join(rootDir, "doc.md"), "# Title\ncontent\n", "utf-8");

    const report = await reviewKnowledgeGraph({
      rootDir,
      strict: false,
      graph: {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        documents: [
          {
            id: "doc-1",
            filePath: "doc.md",
            title: "Doc",
            fileType: "md",
            lastAnalyzed: new Date().toISOString(),
            fileHash: "hash",
            summary: { thesis: "", overview: "", sections: [] },
            concepts: [],
            arguments: [],
            questions: [],
          },
        ],
        edges: [
          { source: "doc-1", target: "doc-1", type: "contains" },
        ],
      },
      manifestFiles: {
        "doc.md": {
          documentId: "doc-1",
          title: "Doc",
          fileHash: "hash",
          lastAnalyzed: new Date().toISOString(),
          facets: {
            summary: { status: "success" },
            concepts: { status: "pending" },
            arguments: { status: "pending" },
            qa: { status: "pending" },
          },
        },
      },
    });

    expect(report.summary.errors).toBe(0);
    expect(report.summary.warnings).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.code === "LOW_CONFIDENCE_SUMMARY")).toBe(true);
  });
});
