import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ManifestSchema, type Manifest } from "../schemas/index.js";
import type { ScannedFile } from "../scanner/index.js";

const OUTPUT_DIR = ".text-comprehend";
const MANIFEST_FILE = "manifest.json";

export class ManifestManager {
  private readonly outputDir: string;
  private readonly manifestPath: string;

  constructor(rootDir: string) {
    this.outputDir = join(rootDir, OUTPUT_DIR);
    this.manifestPath = join(this.outputDir, MANIFEST_FILE);
  }

  async load(): Promise<Manifest> {
    try {
      const raw = await readFile(this.manifestPath, "utf-8");
      return ManifestSchema.parse(JSON.parse(raw));
    } catch {
      return {
        version: "1.0.0",
        lastRun: new Date().toISOString(),
        files: {},
      };
    }
  }

  async save(manifest: Manifest): Promise<void> {
    await mkdir(this.outputDir, { recursive: true });
    const validated = ManifestSchema.parse(manifest);
    await writeFile(this.manifestPath, JSON.stringify(validated, null, 2), "utf-8");
  }

  getChangedFiles(
    manifest: Manifest,
    scannedFiles: ScannedFile[]
  ): ScannedFile[] {
    return scannedFiles.filter((file) => {
      const existing = manifest.files[file.relativePath];
      if (!existing) return true;
      return existing.fileHash !== file.fileHash;
    });
  }

  getFailedFacets(
    manifest: Manifest
  ): { filePath: string; facets: string[] }[] {
    const results: { filePath: string; facets: string[] }[] = [];

    for (const [filePath, entry] of Object.entries(manifest.files)) {
      const failedFacets: string[] = [];
      for (const [facetName, facetStatus] of Object.entries(entry.facets)) {
        if (facetStatus.status === "failed") {
          failedFacets.push(facetName);
        }
      }
      if (failedFacets.length > 0) {
        results.push({ filePath, facets: failedFacets });
      }
    }

    return results;
  }
}
