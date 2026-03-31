import { readdir, readFile, stat, access } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import ignore, { type Ignore } from "ignore";
import {
  isSupportedFileType,
  isBinaryDocumentType,
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

async function loadGitignoreFromDir(dir: string): Promise<string[]> {
  try {
    const gitignorePath = join(dir, ".gitignore");
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

async function walkDirectory(
  dir: string,
  rootDir: string,
  ig: Ignore,
  files: ScannedFile[],
  skipped: { path: string; reason: string }[],
): Promise<void> {
  // Load nested .gitignore if present and merge into a child ignore instance
  const nestedPatterns = await loadGitignoreFromDir(dir);
  if (nestedPatterns.length > 0) {
    ig = ignore().add(ig).add(nestedPatterns);
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(rootDir, fullPath).replace(/\\/g, "/");

    // Skip hidden files/directories
    if (entry.name.startsWith(".")) {
      continue;
    }

    // Check gitignore before descending into directories
    if (ig.ignores(relPath)) {
      skipped.push({ path: relPath, reason: "matched .gitignore pattern" });
      continue;
    }

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, rootDir, ig, files, skipped);
      continue;
    }

    if (!entry.isFile()) continue;

    if (!isSupportedFileType(entry.name)) {
      skipped.push({ path: relPath, reason: "unsupported file type" });
      continue;
    }

    // Binary document types (pdf, docx) need specialized extractors not yet implemented
    if (isBinaryDocumentType(entry.name)) {
      skipped.push({ path: relPath, reason: "binary document extraction not yet supported" });
      continue;
    }

    // Stat first to get size and skip empty files without reading content
    const fileStat = await stat(fullPath);

    if (fileStat.size === 0) {
      skipped.push({ path: relPath, reason: "empty file" });
      continue;
    }

    const content = await readFile(fullPath, "utf-8");

    // Also skip files that are whitespace-only
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
  const rootPatterns = await loadGitignoreFromDir(rootDir);
  const ig = ignore().add(rootPatterns);

  const files: ScannedFile[] = [];
  const skipped: { path: string; reason: string }[] = [];

  await walkDirectory(rootDir, rootDir, ig, files, skipped);

  return {
    rootDir,
    scannedAt: new Date().toISOString(),
    totalFiles: files.length,
    files,
    skipped,
  };
}
