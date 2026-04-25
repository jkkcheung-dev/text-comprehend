import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { ManifestSchema, type Manifest } from "../schemas/index.js";
import type { ScannedFile } from "../scanner/index.js";

const OUTPUT_DIR = ".text-comprehend";
const MANIFEST_FILE = "manifest.json";

function deriveTitleFromPath(filePath: string): string {
  return basename(filePath, extname(filePath)).replace(/[-_]/g, " ");
}

function upgradeLegacyManifestTitles(data: unknown): unknown {
  if (!data || typeof data !== "object" || !("files" in data)) {
    return data;
  }

  const manifest = data as { files?: Record<string, unknown> };
  if (!manifest.files || typeof manifest.files !== "object") {
    return data;
  }

  return {
    ...manifest,
    files: Object.fromEntries(
      Object.entries(manifest.files).map(([filePath, entry]) => {
        if (!entry || typeof entry !== "object" || "title" in entry) {
          return [filePath, entry];
        }

        return [
          filePath,
          {
            ...entry,
            title: deriveTitleFromPath(filePath),
          },
        ];
      }),
    ),
  };
}

export interface LoadResult {
  manifest: Manifest;
  wasCorrupt: boolean;
}

export class ManifestManager {
  private readonly outputDir: string;
  private readonly manifestPath: string;

  constructor(rootDir: string) {
    this.outputDir = join(rootDir, OUTPUT_DIR);
    this.manifestPath = join(this.outputDir, MANIFEST_FILE);
  }

  async load(): Promise<LoadResult> {
    try {
      const raw = await readFile(this.manifestPath, "utf-8");
      const parsed = JSON.parse(raw);
      return { manifest: ManifestSchema.parse(upgradeLegacyManifestTitles(parsed)), wasCorrupt: false };
    } catch (error) {
      // Distinguish between "file doesn't exist" and "file is corrupt"
      const isFileNotFound =
        error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
      return {
        manifest: {
          version: "1.0.0",
          lastRun: new Date().toISOString(),
          files: {},
        },
        wasCorrupt: !isFileNotFound,
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

  getRemovedFiles(
    manifest: Manifest,
    scannedFiles: ScannedFile[]
  ): string[] {
    const currentPaths = new Set(scannedFiles.map((f) => f.relativePath));
    return Object.keys(manifest.files).filter((path) => !currentPaths.has(path));
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
