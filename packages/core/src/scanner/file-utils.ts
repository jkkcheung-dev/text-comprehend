import { createHash } from "node:crypto";
import { extname } from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".md", ".txt", ".pdf", ".rst", ".html", ".docx"]);

export function isSupportedFileType(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function computeFileHash(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

export function generateDocumentId(relativePath: string): string {
  return createHash("sha256")
    .update(relativePath, "utf-8")
    .digest("hex")
    .slice(0, 12);
}
