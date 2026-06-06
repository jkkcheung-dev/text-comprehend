// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { DetailPanelShell } from "./detail-panel-shell";
import {
  createDocument,
  createAvailableDetail,
  createAvailableDetailFull,
  createDegradedDetail,
  createQuestion,
} from "../test/factories";

afterEach(() => {
  cleanup();
});

describe("DetailPanelShell (with tabs)", () => {
  it("renders tab bar", () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull());
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("Layered Summary")).toBeInTheDocument();
    expect(screen.getByText("Concept Glossary")).toBeInTheDocument();
    expect(screen.getByText("Argument Map")).toBeInTheDocument();
    expect(screen.getByText("Comprehension Check")).toBeInTheDocument();
  });

  it("Layered Summary tab is active by default", () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull("# My Summary"));
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("My Summary")).toBeInTheDocument();
  });

  it("switches to Concept Glossary tab on click", async () => {
    const doc = createDocument(
      "doc-1",
      "Test Document",
      createAvailableDetailFull("# Summary", "# Glossary Content"),
    );
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    fireEvent.click(screen.getByText("Concept Glossary"));
    expect(screen.getByText("Glossary Content")).toBeInTheDocument();
  });

  it("switches to Argument Map tab on click", async () => {
    const doc = createDocument(
      "doc-1",
      "Test Document",
      createAvailableDetailFull("# Summary", "# G", "# Argument Content"),
    );
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    fireEvent.click(screen.getByText("Argument Map"));
    expect(screen.getByText("Argument Content")).toBeInTheDocument();
  });

  it("switches to Comprehension Check tab on click", async () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull());
    doc.questions = [createQuestion("q1", "What is X?")];
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    fireEvent.click(screen.getByText("Comprehension Check"));
    expect(screen.getByText(/What is X\?/)).toBeInTheDocument();
  });

  it("shows tab content via renderMarkdown", () => {
    const doc = createDocument("doc-1", "Doc", createAvailableDetailFull("**bold** text"));
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("bold")).toBeInTheDocument();
  });

  it("shows no-document message when document is null", () => {
    render(<DetailPanelShell document={null} selectedNodeId={null} selection={null} />);
    expect(screen.getByText(/Select a document/)).toBeInTheDocument();
  });

  it("renders degraded message for degraded documents", () => {
    const doc = createDocument(
      "doc-1",
      "Doc",
      createDegradedDetail("path/to/file", "Missing"),
    );
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText(/unavailable/)).toBeInTheDocument();
  });

  it("resets to Layered Summary tab when document changes", async () => {
    const doc1 = createDocument("doc-1", "Doc One", createAvailableDetailFull("# Summary One"));
    const { rerender } = render(
      <DetailPanelShell document={doc1} selectedNodeId={null} selection={null} />,
    );
    fireEvent.click(screen.getByText("Concept Glossary"));

    const doc2 = createDocument("doc-2", "Doc Two", createAvailableDetailFull("# Summary Two"));
    rerender(<DetailPanelShell document={doc2} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("Summary Two")).toBeInTheDocument();
  });

  it("renders selection info bar when selection is provided", () => {
    const doc = createDocument("doc-1", "Test Doc", createAvailableDetailFull("# Summary"));
    render(
      <DetailPanelShell
        document={doc}
        selectedNodeId="node-1"
        selection={{ kind: "concept", label: "Event Loop", documentTitle: "Test Doc", definition: "A programming construct", importance: "high" }}
      />,
    );
    expect(screen.getByText("Event Loop")).toBeInTheDocument();
  });
});
