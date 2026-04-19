import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveFacetOutput, loadFacetOutput, loadAllFacetsForDocument, getFacetOutputPath } from "../facet-persistence.js";

describe("facet-persistence", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "tc-facet-"));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("saves and loads a facet output", async () => {
    const data = { documentId: "doc1", summary: { thesis: "test" } };
    await saveFacetOutput(rootDir, "summary", "doc1", data);
    const loaded = await loadFacetOutput(rootDir, "summary", "doc1");
    expect(loaded).toEqual(data);
  });

  it("returns null for non-existent facet", async () => {
    const loaded = await loadFacetOutput(rootDir, "summary", "nonexistent");
    expect(loaded).toBeNull();
  });

  it("loads all facets for a document", async () => {
    await saveFacetOutput(rootDir, "summary", "doc1", { type: "summary" });
    await saveFacetOutput(rootDir, "concepts", "doc1", { type: "concepts" });
    const result = await loadAllFacetsForDocument(rootDir, "doc1");
    expect(result.summary).toEqual({ type: "summary" });
    expect(result.concepts).toEqual({ type: "concepts" });
    expect(result.arguments).toBeNull();
    expect(result.qa).toBeNull();
  });

  it("stores summary output in the summaries directory", async () => {
    const data = { documentId: "doc1", summary: { thesis: "test" } };
    await saveFacetOutput(rootDir, "summary", "doc1", data);

    const summaryPath = getFacetOutputPath(rootDir, "summary", "doc1");
    expect(summaryPath).toContain(join("facets", "summaries", "doc1.json"));
  });
});
