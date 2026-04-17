import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { FacetType } from "./types.js";

const OUTPUT_DIR = ".text-comprehend";
const FACETS_DIR = "facets";

function facetPath(rootDir: string, facetType: FacetType, documentId: string): string {
  return join(rootDir, OUTPUT_DIR, FACETS_DIR, facetType, `${documentId}.json`);
}

export async function saveFacetOutput(
  rootDir: string,
  facetType: FacetType,
  documentId: string,
  data: unknown,
): Promise<void> {
  const filePath = facetPath(rootDir, facetType, documentId);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function loadFacetOutput(
  rootDir: string,
  facetType: FacetType,
  documentId: string,
): Promise<unknown | null> {
  try {
    const raw = await readFile(facetPath(rootDir, facetType, documentId), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadAllFacetsForDocument(
  rootDir: string,
  documentId: string,
): Promise<Record<FacetType, unknown | null>> {
  const facetTypes: FacetType[] = ["summary", "concepts", "arguments", "qa"];
  const results = await Promise.all(
    facetTypes.map((ft) => loadFacetOutput(rootDir, ft, documentId)),
  );
  return {
    summary: results[0],
    concepts: results[1],
    arguments: results[2],
    qa: results[3],
  };
}
