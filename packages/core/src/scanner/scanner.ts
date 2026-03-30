import { readdir, readFile, stat, access } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import {
  isSupportedFileType,
  computeFileHash,
  generateDocumentId,
} from "./file-utils.js";

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  documentId: string;
  fileHash: string;
  fileType: string;
  sizeBytes: number;
}

export interface ScanResult {
  rootDir: string;
  scannedAt: string;
  totalFiles: number;
  files: ScannedFile[];
  skipped: { path: string; reason: string }[];
}

async function loadGitignorePatterns(rootDir: string): Promise<string[]> {
  try {
    const gitignorePath = join(rootDir, ".gitignore");
    await access(gitignorePath);
    const content = await readFile(gitignorePath, "utf-8");
    return content
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function matchesGitignore(relativePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.startsWith("*.")) {
      const ext = pattern.slice(1);
      if (relativePath.endsWith(ext)) return true;
    }
    if (pattern.endsWith("/")) {
      if (
        relativePath.startsWith(pattern) ||
        relativePath.includes("/" + pattern)
      ) {
        return true;
      }
    }
    if (relativePath === pattern) return true;
  }
  return false;
}

async function walkDirectory(
  dir: string,
  rootDir: string,
  ignorePatterns: string[],
  files: ScannedFile[],
  skipped: { path: string; reason: string }[],
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(rootDir, fullPath).replace(/\\/g, "/");

    if (entry.name.startsWith(".")) {
      continue;
    }

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, rootDir, ignorePatterns, files, skipped);
      continue;
    }

    if (!entry.isFile()) continue;

    if (matchesGitignore(relPath, ignorePatterns)) {
      skipped.push({ path: relPath, reason: "matched .gitignore pattern" });
      continue;
    }

    if (!isSupportedFileType(entry.name)) {
      skipped.push({ path: relPath, reason: "unsupported file type" });
      continue;
    }

    const content = await readFile(fullPath, "utf-8");
    const fileStat = await stat(fullPath);

    if (content.trim().length === 0) {
      skipped.push({ path: relPath, reason: "empty file" });
      continue;
    }

    files.push({
      relativePath: relPath,
      absolutePath: fullPath,
      documentId: generateDocumentId(relPath),
      fileHash: computeFileHash(content),
      fileType: extname(entry.name).slice(1).toLowerCase(),
      sizeBytes: fileStat.size,
    });
  }
}

export async function scanDirectory(rootDir: string): Promise<ScanResult> {
  const ignorePatterns = await loadGitignorePatterns(rootDir);
  const files: ScannedFile[] = [];
  const skipped: { path: string; reason: string }[] = [];

  await walkDirectory(rootDir, rootDir, ignorePatterns, files, skipped);

  return {
    rootDir,
    scannedAt: new Date().toISOString(),
    totalFiles: files.length,
    files,
    skipped,
  };
}
