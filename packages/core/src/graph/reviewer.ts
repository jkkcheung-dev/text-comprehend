import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { findOrphans } from "./dedup.js";
import {
  ReviewReportSchema,
  type KnowledgeGraph,
  type Manifest,
  type ReviewFinding,
  type ReviewReport,
  type SourceRef,
} from "../schemas/index.js";

const OUTPUT_DIR = ".text-comprehend";
const REVIEW_REPORT_FILE = "review-report.json";

export interface ReviewKnowledgeGraphOptions {
  rootDir: string;
  graph: KnowledgeGraph;
  manifestFiles: Manifest["files"];
  strict: boolean;
}

function pushFinding(findings: ReviewFinding[], finding: ReviewFinding): void {
  findings.push(finding);
}

function collectSourceRefs(graph: KnowledgeGraph): Array<{ filePath: string; sourceRef: SourceRef }> {
  return graph.documents.flatMap((document) => [
    ...document.summary.sections.map((section) => ({ filePath: document.filePath, sourceRef: section.sourceRange })),
    ...document.concepts.flatMap((concept) => concept.sourceRefs.map((sourceRef) => ({ filePath: document.filePath, sourceRef }))),
    ...document.arguments.flatMap((argument) => [
      ...argument.sourceRefs.map((sourceRef) => ({ filePath: document.filePath, sourceRef })),
      ...argument.evidence.map((evidence) => ({ filePath: document.filePath, sourceRef: evidence.sourceRef })),
    ]),
    ...document.questions.flatMap((question) => question.sourceRefs.map((sourceRef) => ({ filePath: document.filePath, sourceRef }))),
  ]);
}

export async function reviewKnowledgeGraph(options: ReviewKnowledgeGraphOptions): Promise<ReviewReport> {
  const findings: ReviewFinding[] = [];
  const documentsById = new Map(options.graph.documents.map((document) => [document.id, document]));

  for (const [filePath, entry] of Object.entries(options.manifestFiles)) {
    const hasSuccessfulFacet = Object.values(entry.facets).some((facet) => facet.status === "success");
    const document = documentsById.get(entry.documentId);

    if (hasSuccessfulFacet && !document) {
      pushFinding(findings, {
        severity: "error",
        code: "MISSING_GRAPH_DOCUMENT",
        documentId: entry.documentId,
        filePath,
        message: "Manifest entry has successful facets but no matching graph document.",
      });
      continue;
    }

    if (!document) continue;

    if (entry.facets.summary.status === "success" && !document.summary.thesis.trim() && !document.summary.overview.trim()) {
      pushFinding(findings, {
        severity: "warning",
        code: "LOW_CONFIDENCE_SUMMARY",
        documentId: document.id,
        filePath: document.filePath,
        message: "Summary facet succeeded but thesis and overview are blank.",
      });
    }
  }

  for (const orphanId of findOrphans(options.graph.documents, options.graph.edges)) {
    pushFinding(findings, {
      severity: "error",
      code: "ORPHAN_NODE",
      nodeId: orphanId,
      message: `Graph node is orphaned: ${orphanId}`,
    });
  }

  for (const { filePath, sourceRef } of collectSourceRefs(options.graph)) {
    const targetDocument = documentsById.get(sourceRef.documentId);
    if (!targetDocument) {
      pushFinding(findings, {
        severity: "error",
        code: "MISSING_SOURCE_DOCUMENT",
        documentId: sourceRef.documentId,
        filePath,
        message: "Source reference points to a documentId missing from the graph.",
      });
      continue;
    }

    let rawContent: string;
    try {
      rawContent = await readFile(join(options.rootDir, targetDocument.filePath), "utf-8");
    } catch {
      pushFinding(findings, {
        severity: "error",
        code: "MISSING_SOURCE_FILE",
        documentId: targetDocument.id,
        filePath: targetDocument.filePath,
        message: "Source reference points to a file that no longer exists on disk.",
      });
      continue;
    }

    const lineCount = rawContent.split("\n").length;
    if (sourceRef.startLine > lineCount || sourceRef.endLine > lineCount) {
      pushFinding(findings, {
        severity: "error",
        code: "INVALID_SOURCE_RANGE",
        documentId: targetDocument.id,
        filePath: targetDocument.filePath,
        message: `Source range ${sourceRef.startLine}-${sourceRef.endLine} exceeds file length ${lineCount}.`,
      });
    }

    if (!sourceRef.excerpt.trim()) {
      pushFinding(findings, {
        severity: "warning",
        code: "EMPTY_SOURCE_EXCERPT",
        documentId: targetDocument.id,
        filePath: targetDocument.filePath,
        message: "Source reference excerpt is blank.",
      });
    }
  }

  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const report = ReviewReportSchema.parse({
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    strict: options.strict,
    summary: {
      errors,
      warnings,
      passed: errors === 0,
    },
    findings,
  });

  const outputDir = join(options.rootDir, OUTPUT_DIR);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, REVIEW_REPORT_FILE), JSON.stringify(report, null, 2), "utf-8");

  return report;
}
