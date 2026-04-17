#!/usr/bin/env npx tsx
/**
 * test-drive.ts - Exercise the text-comprehend core library interactively.
 *
 * Two modes:
 *   npx tsx scripts/test-drive.ts scan [directory]
 *     Scans a directory (default: tests/fixtures/sample-corpus/), shows
 *     discovered files, manifest state, and prints agent prompts for the
 *     first document so you can paste them into an LLM.
 *
 *   npx tsx scripts/test-drive.ts validate <agent> <file>
 *     Reads a JSON file containing an LLM response and validates it against
 *     the corresponding agent output schema.
 *     <agent> is one of: summarizer, concept, argument, qa
 */

import { readFile } from "node:fs/promises";
import { resolve, basename, extname } from "node:path";
import type { ZodSchema } from "zod";

import {
  scanDirectory,
  ManifestManager,
  buildSummarizerPrompt,
  buildConceptExtractorPrompt,
  buildArgumentMapperPrompt,
  buildQAGeneratorPrompt,
  parseAgentResponse,
  SummarizerOutputSchema,
  ConceptExtractorOutputSchema,
  ArgumentMapperOutputSchema,
  QAGeneratorOutputSchema,
  type AgentInput,
} from "@text-comprehend/core";

// ── Helpers ──────────────────────────────────────────────────────────

const DIVIDER = "─".repeat(72);

function heading(text: string) {
  console.log(`\n${DIVIDER}`);
  console.log(`  ${text}`);
  console.log(DIVIDER);
}

function printUsage() {
  console.log(`
Usage:
  npx tsx scripts/test-drive.ts scan [directory]
    Scan a directory and print agent prompts for the first document.
    Default directory: tests/fixtures/sample-corpus/

  npx tsx scripts/test-drive.ts validate <agent> <file>
    Validate an LLM JSON response against an agent output schema.
    <agent>: summarizer | concept | argument | qa
    <file>:  path to a .json file containing the LLM response
`);
}

function getAgentSchema(name: string): { schema: ZodSchema; label: string } | undefined {
  switch (name) {
    case "summarizer": return { schema: SummarizerOutputSchema, label: "Summarizer" };
    case "concept":    return { schema: ConceptExtractorOutputSchema, label: "Concept Extractor" };
    case "argument":   return { schema: ArgumentMapperOutputSchema, label: "Argument Mapper" };
    case "qa":         return { schema: QAGeneratorOutputSchema, label: "QA Generator" };
    default:           return undefined;
  }
}

const VALID_AGENTS = ["summarizer", "concept", "argument", "qa"];

// ── scan command ─────────────────────────────────────────────────────

async function runScan(targetDir: string) {
  heading("1. Scanning directory");
  console.log(`  Target: ${targetDir}\n`);

  const result = await scanDirectory(targetDir);

  console.log(`  Scanned at : ${result.scannedAt}`);
  console.log(`  Total files: ${result.totalFiles}`);

  if (result.files.length > 0) {
    console.log("\n  Discovered files:");
    for (const f of result.files) {
      console.log(`    [${f.fileType}] ${f.relativePath}`);
      console.log(`          id=${f.documentId}  hash=${f.fileHash.slice(0, 12)}...  size=${f.sizeBytes}B`);
    }
  }

  if (result.skipped.length > 0) {
    console.log("\n  Skipped files:");
    for (const s of result.skipped) {
      console.log(`    ${s.path} (${s.reason})`);
    }
  }

  // ── Manifest ──────────────────────────────────────────────────────
  heading("2. Manifest manager");

  const mm = new ManifestManager(targetDir);
  const { manifest, wasCorrupt } = await mm.load();

  console.log(`  Loaded manifest (wasCorrupt=${wasCorrupt})`);
  console.log(`  Files in manifest: ${Object.keys(manifest.files).length}`);

  const changed = mm.getChangedFiles(manifest, result.files);
  const removed = mm.getRemovedFiles(manifest, result.files);
  const failed  = mm.getFailedFacets(manifest);

  console.log(`  Changed / new files: ${changed.length}`);
  console.log(`  Removed files:       ${removed.length}`);
  console.log(`  Files with failures: ${failed.length}`);

  if (result.files.length === 0) {
    console.log("\n  No documents found - nothing to generate prompts for.");
    return;
  }

  // ── Prompt generation ─────────────────────────────────────────────
  heading("3. Agent prompts (first document)");

  const firstFile = result.files[0];
  const content = await readFile(firstFile.absolutePath, "utf-8");

  // Infer a title from the filename or first heading
  const firstLine = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  const title = firstLine.startsWith("#")
    ? firstLine.replace(/^#+\s*/, "")
    : basename(firstFile.relativePath, extname(firstFile.relativePath));

  const agentInput: AgentInput = {
    documentId: firstFile.documentId,
    filePath: firstFile.relativePath,
    title,
    content,
  };

  console.log(`  Document: ${firstFile.relativePath}`);
  console.log(`  Title:    ${title}`);
  console.log(`  ID:       ${firstFile.documentId}`);

  const prompts = [
    { name: "Summarizer",        prompt: buildSummarizerPrompt(agentInput) },
    { name: "Concept Extractor", prompt: buildConceptExtractorPrompt(agentInput) },
    { name: "Argument Mapper",   prompt: buildArgumentMapperPrompt(agentInput) },
    { name: "QA Generator",      prompt: buildQAGeneratorPrompt(agentInput) },
  ];

  for (const { name, prompt } of prompts) {
    heading(`Prompt: ${name}`);
    console.log(prompt);
  }

  // ── Next steps ────────────────────────────────────────────────────
  heading("What to do next");
  console.log(`
  1. Copy one of the prompts above and paste it into an LLM (ChatGPT, Claude, etc.)
  2. Save the LLM's JSON response to a file, e.g.:
       responses/summarizer-response.json
  3. Validate it:
       npx tsx scripts/test-drive.ts validate summarizer responses/summarizer-response.json
       npx tsx scripts/test-drive.ts validate concept   responses/concept-response.json
       npx tsx scripts/test-drive.ts validate argument  responses/argument-response.json
       npx tsx scripts/test-drive.ts validate qa        responses/qa-response.json
  `);
}

// ── validate command ─────────────────────────────────────────────────

async function runValidate(agentName: string, filePath: string) {
  const agentInfo = getAgentSchema(agentName);
  if (!agentInfo) {
    console.error(`Unknown agent: "${agentName}". Must be one of: ${VALID_AGENTS.join(", ")}`);
    process.exit(1);
  }

  const { schema, label } = agentInfo;

  heading(`Validating ${label} output`);
  console.log(`  File: ${filePath}\n`);

  let raw: string;
  try {
    raw = await readFile(resolve(filePath), "utf-8");
  } catch (err) {
    console.error(`  Failed to read file: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const result = parseAgentResponse(raw, schema);

  if (result.success) {
    console.log("  Result: VALID\n");
    console.log("  Parsed output (summary):\n");
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log("  Result: INVALID\n");
    console.log(`  Error: ${result.error}`);
    console.log("\n  The LLM response did not match the expected schema.");
    console.log("  Try adjusting the LLM output or re-running the prompt.");
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  printUsage();
  process.exit(0);
}

switch (command) {
  case "scan": {
    const rootDir = resolve(process.cwd(), ".");
    const targetDir = args[1]
      ? resolve(args[1])
      : resolve(rootDir, "tests/fixtures/sample-corpus");
    await runScan(targetDir);
    break;
  }
  case "validate": {
    const agentName = args[1];
    const filePath = args[2];
    if (!agentName || !filePath) {
      console.error("Usage: npx tsx scripts/test-drive.ts validate <agent> <file>");
      process.exit(1);
    }
    await runValidate(agentName, filePath);
    break;
  }
  default:
    console.error(`Unknown command: "${command}"`);
    printUsage();
    process.exit(1);
}
