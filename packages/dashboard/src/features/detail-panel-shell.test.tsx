// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { createAvailableDetail, createDegradedDetail, createDocument } from "../test/factories";
import { DetailPanelShell } from "./detail-panel-shell";

afterEach(() => {
  cleanup();
});

describe("DetailPanelShell", () => {
  it("shows the empty selection state when no document is selected", () => {
    render(<DetailPanelShell document={null} selectedNodeId={null} selection={null} />);

    expect(screen.getByText("Select a document to inspect its content.")).toBeInTheDocument();
    expect(screen.getByText("Selected node: none")).toBeInTheDocument();
  });

  it("renders layered summary content for available document detail", () => {
    render(
      <DetailPanelShell
        document={createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))}
        selection={{
          kind: "document",
          label: "Document One",
          documentTitle: "Document One",
          filePath: "docs/doc-1.md",
          fileType: "md",
          lastAnalyzed: "2026-04-28T00:00:00.000Z",
        }}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "Document One" })).toBeInTheDocument();
    expect(screen.getByText("Node type: document")).toBeInTheDocument();
    expect(screen.getByText("File path: docs/doc-1.md")).toBeInTheDocument();
    expect(screen.getByText("File type: md")).toBeInTheDocument();
    expect(screen.getByText("Last analyzed: 2026-04-28T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("# Document One")).toBeInTheDocument();
  });

  it("renders concept detail when a concept node is selected", () => {
    render(
      <DetailPanelShell
        document={createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))}
        selection={{
          kind: "concept",
          label: "Event Loop",
          documentTitle: "Document One",
          definition: "Event Loop definition",
          importance: "core",
          sourceRefs: [{ documentId: "doc-1", startLine: 4, endLine: 7, excerpt: "Event loop excerpt" }],
        }}
        selectedNodeId="doc-1:concept:concept-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "Event Loop" })).toBeInTheDocument();
    expect(screen.getByText("Node type: concept")).toBeInTheDocument();
    expect(screen.getByText("Event Loop definition")).toBeInTheDocument();
    expect(screen.getByText("Importance: core")).toBeInTheDocument();
    expect(screen.getByText("Document: Document One")).toBeInTheDocument();
    expect(screen.getByText("doc-1 lines 4-7: Event loop excerpt")).toBeInTheDocument();
  });

  it("renders argument detail when an argument node is selected", () => {
    render(
      <DetailPanelShell
        document={createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))}
        selection={{
          kind: "argument",
          label: "Rendering stays responsive",
          documentTitle: "Document One",
          argumentType: "main",
          sourceRefs: [{ documentId: "doc-1", startLine: 10, endLine: 12, excerpt: "Argument excerpt" }],
          evidence: [
            {
              content: "Profiler samples show shorter commits.",
              type: "data",
              strength: "strong",
              sourceRef: {
                documentId: "doc-1",
                startLine: 13,
                endLine: 14,
                excerpt: "Evidence excerpt",
              },
            },
          ],
          assumptions: ["Assumption A"],
          gaps: ["Gap A"],
        }}
        selectedNodeId="doc-1:argument:argument-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "Rendering stays responsive" })).toBeInTheDocument();
    expect(screen.getByText("Node type: argument")).toBeInTheDocument();
    expect(screen.getByText("Type: main")).toBeInTheDocument();
    expect(screen.getByText("Evidence items: 1")).toBeInTheDocument();
    expect(screen.getByText("data (strong): Profiler samples show shorter commits.")).toBeInTheDocument();
    expect(screen.getByText("doc-1 lines 10-12: Argument excerpt")).toBeInTheDocument();
    expect(screen.getByText("Assumption A")).toBeInTheDocument();
    expect(screen.getByText("Gap A")).toBeInTheDocument();
    expect(screen.getByText("Document: Document One")).toBeInTheDocument();
  });

  it("renders question detail when a question node is selected", () => {
    render(
      <DetailPanelShell
        document={createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))}
        selection={{
          kind: "question",
          label: "What triggers rerendering?",
          documentTitle: "Document One",
          answer: "State updates",
          difficulty: "basic",
          facet: "factual",
          sourceRefs: [{ documentId: "doc-1", startLine: 21, endLine: 22, excerpt: "Question excerpt" }],
        }}
        selectedNodeId="doc-1:question:question-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "What triggers rerendering?" })).toBeInTheDocument();
    expect(screen.getByText("Node type: question")).toBeInTheDocument();
    expect(screen.getByText("Answer: State updates")).toBeInTheDocument();
    expect(screen.getByText("Difficulty: basic")).toBeInTheDocument();
    expect(screen.getByText("Facet: factual")).toBeInTheDocument();
    expect(screen.getByText("Document: Document One")).toBeInTheDocument();
    expect(screen.getByText("doc-1 lines 21-22: Question excerpt")).toBeInTheDocument();
  });

  it("renders the degraded document detail message and artifact path", () => {
    render(
      <DetailPanelShell
        document={createDocument(
          "doc-2",
          "Document Two",
          createDegradedDetail(
            ".text-comprehend/simplified/doc-2/layered-summary.md",
            "ENOENT: missing file",
          ),
        )}
        selection={{
          kind: "document",
          label: "Document Two",
          documentTitle: "Document Two",
          filePath: "docs/doc-2.md",
          fileType: "md",
          lastAnalyzed: "2026-04-28T00:00:00.000Z",
        }}
        selectedNodeId="node-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "Document Two" })).toBeInTheDocument();
    expect(screen.getByText("Selected node: node-1")).toBeInTheDocument();
    expect(screen.getByText("Node type: document")).toBeInTheDocument();
    expect(screen.getByText("File path: docs/doc-2.md")).toBeInTheDocument();
    expect(screen.getByText("Document detail is unavailable for this artifact.")).toBeInTheDocument();
    expect(screen.getByText(".text-comprehend/simplified/doc-2/layered-summary.md")).toBeInTheDocument();
    expect(screen.getByText("ENOENT: missing file")).toBeInTheDocument();
  });

  it("preserves degraded document messaging when a concept is selected", () => {
    render(
      <DetailPanelShell
        document={createDocument(
          "doc-2",
          "Document Two",
          createDegradedDetail(
            ".text-comprehend/simplified/doc-2/layered-summary.md",
            "ENOENT: missing file",
          ),
        )}
        selection={{
          kind: "concept",
          label: "Event Loop",
          documentTitle: "Document Two",
          definition: "Event Loop definition",
          importance: "core",
          sourceRefs: [{ documentId: "doc-2", startLine: 4, endLine: 7, excerpt: "Event loop excerpt" }],
        }}
        selectedNodeId="doc-2:concept:concept-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "Event Loop" })).toBeInTheDocument();
    expect(screen.getByText("Event Loop definition")).toBeInTheDocument();
    expect(screen.getByText("Document detail is unavailable for this artifact.")).toBeInTheDocument();
    expect(screen.getByText(".text-comprehend/simplified/doc-2/layered-summary.md")).toBeInTheDocument();
    expect(screen.getByText("ENOENT: missing file")).toBeInTheDocument();
  });
});
