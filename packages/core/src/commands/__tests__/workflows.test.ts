import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { AgentExecutor } from "../../pipeline/index.js";
import {
  listAnalyzedDocuments,
  resolveChatWorkflow,
  resolveSummaryWorkflow,
  runComprehendWorkflow,
} from "../workflows.js";

function createMockExecutor(): AgentExecutor {
  return async (prompt) => {
    if (prompt.includes("repository-backed chat answer")) {
      return "Repository answer based on analyzed artifacts.";
    }
    if (prompt.includes("summarization specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({
        documentId,
        summary: { thesis: "T", overview: "O", sections: [] },
      });
    }
    if (prompt.includes("concept extraction specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({ documentId, concepts: [], relationships: [] });
    }
    if (prompt.includes("argument analysis specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({ documentId, arguments: [] });
    }
    const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
    return JSON.stringify({ documentId, questions: [] });
  };
}

function createRichExecutor(): AgentExecutor {
  return async (prompt) => {
    if (prompt.includes("repository-backed chat answer")) {
      return "Alpha is defined as the Alpha concept in alpha.md.";
    }

    const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
    const filePath = prompt.match(/- File: (.+)/)?.[1]?.trim() ?? "unknown.md";
    const title = prompt.match(/- Title: (.+)/)?.[1]?.trim() ?? "unknown";

    if (prompt.includes("summarization specialist")) {
      return JSON.stringify({
        documentId,
        summary: {
          thesis: `${title} thesis`,
          overview: `${title} overview paragraph.`,
          sections: [
            {
              id: `${documentId}-sec-1`,
              heading: `${title} section`,
              summary: `${title} section summary`,
              keyPoints: [`${title} key point`],
              sourceRange: {
                documentId,
                startLine: 1,
                endLine: 3,
                excerpt: `${title} summary excerpt`,
              },
            },
          ],
        },
      });
    }

    if (prompt.includes("concept extraction specialist")) {
      return JSON.stringify({
        documentId,
        concepts: [
          {
            id: `${documentId}-concept-1`,
            name: `${title} concept`,
            definition: `${title} concept definition for ${filePath}`,
            importance: "core",
            sourceRefs: [
              {
                documentId,
                startLine: 2,
                endLine: 4,
                excerpt: `${title} concept excerpt`,
              },
            ],
          },
        ],
        relationships: [],
      });
    }

    if (prompt.includes("argument analysis specialist")) {
      return JSON.stringify({
        documentId,
        arguments: [
          {
            id: `${documentId}-arg-1`,
            claim: `${title} main claim`,
            type: "main",
            evidence: [
              {
                content: `${title} evidence`,
                type: "reasoning",
                strength: "strong",
                sourceRef: {
                  documentId,
                  startLine: 5,
                  endLine: 6,
                  excerpt: `${title} evidence excerpt`,
                },
              },
            ],
            assumptions: [`${title} assumption`],
            gaps: [`${title} gap`],
            sourceRefs: [
              {
                documentId,
                startLine: 5,
                endLine: 7,
                excerpt: `${title} claim excerpt`,
              },
            ],
          },
        ],
      });
    }

    return JSON.stringify({
      documentId,
      questions: [
        {
          id: `${documentId}-q-1`,
          question: `What is ${title}?`,
          answer: `${title} answer`,
          difficulty: "basic",
          facet: "factual",
          sourceRefs: [
            {
              documentId,
              startLine: 8,
              endLine: 9,
              excerpt: `${title} answer excerpt`,
            },
          ],
        },
      ],
    });
  };
}

describe("command workflows", () => {
  it("runs full analysis by default", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-cmd-"));
    await writeFile(join(rootDir, "doc.md"), "# Doc\n\ncontent", "utf-8");

    const result = await runComprehendWorkflow({
      rootDir,
      agentExecutor: createMockExecutor(),
    });

    expect(result.documentsProcessed).toBe(1);
    expect(result.results[0].filePath).toBe("doc.md");

    await rm(rootDir, { recursive: true, force: true });
  });

  it("passes retryFailed through the same code path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-cmd-"));
    await writeFile(join(rootDir, "doc.md"), "# Doc\n\ncontent", "utf-8");

    let failSummary = true;
    const flakyExecutor: AgentExecutor = async (prompt) => {
      if (failSummary && prompt.includes("summarization specialist")) {
        throw new Error("timeout");
      }
      return createMockExecutor()(prompt);
    };

    await runComprehendWorkflow({ rootDir, agentExecutor: flakyExecutor });
    failSummary = false;

    const retried = await runComprehendWorkflow({
      rootDir,
      retryFailed: true,
      agentExecutor: flakyExecutor,
    });

    expect(retried.documentsProcessed).toBe(1);
    expect(retried.facetsSucceeded).toBe(1);

    await rm(rootDir, { recursive: true, force: true });
  });

  it("passes review flags through the comprehend workflow", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-cmd-"));
    await writeFile(join(rootDir, "doc.md"), "# Doc\n\ncontent", "utf-8");

    const result = await runComprehendWorkflow({
      rootDir,
      review: true,
      reviewStrict: true,
      agentExecutor: createMockExecutor(),
    });

    expect(result.review.ran).toBe(true);

    await rm(rootDir, { recursive: true, force: true });
  });

  it("lists analyzed documents from the knowledge graph", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-summary-"));
    await writeFile(join(rootDir, "doc.md"), "# Doc\n\ncontent", "utf-8");
    await runComprehendWorkflow({ rootDir, agentExecutor: createMockExecutor() });

    const docs = await listAnalyzedDocuments(rootDir);

    expect(docs).toEqual([
      expect.objectContaining({
        filePath: "doc.md",
        title: "Doc",
      }),
    ]);

    await rm(rootDir, { recursive: true, force: true });
  });

  it("returns rendered summary for an already analyzed file", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-summary-"));
    await writeFile(join(rootDir, "doc.md"), "# Doc\n\ncontent", "utf-8");
    await runComprehendWorkflow({ rootDir, agentExecutor: createMockExecutor() });

    const result = await resolveSummaryWorkflow({
      rootDir,
      filePath: "doc.md",
      agentExecutor: createMockExecutor(),
    });

    expect(result.status).toBe("analyzed");
    if (result.status !== "analyzed") {
      throw new Error("Expected analyzed result");
    }
    expect(result.document.filePath).toBe("doc.md");
    expect(result.layeredSummary).toContain("> Source: `doc.md`");

    await rm(rootDir, { recursive: true, force: true });
  });

  it("runs on-demand single-file analysis when the file exists but is not yet analyzed", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-summary-"));
    await writeFile(join(rootDir, "new.md"), "# New\n\ncontent", "utf-8");

    const result = await resolveSummaryWorkflow({
      rootDir,
      filePath: "new.md",
      agentExecutor: createMockExecutor(),
    });

    expect(result.status).toBe("analyzed-on-demand");
    if (result.status !== "analyzed-on-demand") {
      throw new Error("Expected analyzed-on-demand result");
    }
    expect(result.document.filePath).toBe("new.md");
    expect(result.layeredSummary).toContain("> Source: `new.md`");

    await rm(rootDir, { recursive: true, force: true });
  });

  it("returns not-found when the requested file does not exist", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-summary-"));

    const result = await resolveSummaryWorkflow({
      rootDir,
      filePath: "missing.md",
      agentExecutor: createMockExecutor(),
    });

    expect(result.status).toBe("not-found");

    await rm(rootDir, { recursive: true, force: true });
  });

  it("returns a clear missing-artifacts state when no knowledge graph exists", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-chat-"));

    const result = await resolveChatWorkflow({
      rootDir,
      question: "What is this repo about?",
      agentExecutor: createMockExecutor(),
    });

    expect(result.status).toBe("missing-artifacts");

    await rm(rootDir, { recursive: true, force: true });
  });

  it("loads relevant analyzed artifacts for a question", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "tc-chat-"));
    await writeFile(join(rootDir, "alpha.md"), "# Alpha\n\ncontent", "utf-8");
    await writeFile(join(rootDir, "beta.md"), "# Beta\n\ncontent", "utf-8");

    await runComprehendWorkflow({ rootDir, agentExecutor: createRichExecutor() });

    const result = await resolveChatWorkflow({
      rootDir,
      question: "What is the Alpha concept definition?",
      agentExecutor: createRichExecutor(),
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") {
      throw new Error("Expected ready result");
    }
    expect(result.documents.map((doc) => doc.filePath)).toEqual(["alpha.md"]);
    expect(result.answer).toBe("Alpha is defined as the Alpha concept in alpha.md.");
    expect(result.documents[0].conceptGlossary).toContain("Alpha concept definition for alpha.md");
    expect(result.documents[0].argumentMap).toContain("Alpha main claim");
    expect(result.documents[0].comprehensionCheck).toContain("What is Alpha?");

    await rm(rootDir, { recursive: true, force: true });
  });
});
