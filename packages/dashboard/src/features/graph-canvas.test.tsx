// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphCanvas } from "./graph-canvas";

afterEach(() => {
  cleanup();
});

describe("GraphCanvas", () => {
  it("renders graph nodes and notifies selection", () => {
    const onSelectNode = vi.fn();

    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:document:doc-1",
            rawId: "doc-1",
            kind: "document",
            label: "Document One",
            documentId: "doc-1",
            searchText: "document one",
          },
        ]}
        edges={[]}
        matchedNodeIds={["doc-1:document:doc-1"]}
        selectedNodeId={null}
        onSelectNode={onSelectNode}
        emptyMessage="No graph matches."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select graph node Document One" }));

    expect(onSelectNode).toHaveBeenCalledWith("doc-1:document:doc-1");
  });

  it("shows the empty-results message when no nodes are visible", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    expect(screen.getByText("No graph matches.")).toBeInTheDocument();
  });

  it("renders visible edges from the graph view-model", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:document:doc-1",
            rawId: "doc-1",
            kind: "document",
            label: "Document One",
            documentId: "doc-1",
            searchText: "document one",
          },
          {
            id: "doc-1:concept:concept-1",
            rawId: "concept-1",
            kind: "concept",
            label: "Concept One",
            documentId: "doc-1",
            searchText: "concept one",
          },
        ]}
        edges={[
          {
            source: "doc-1:document:doc-1",
            target: "doc-1:concept:concept-1",
            rawSource: "doc-1",
            rawTarget: "concept-1",
            type: "contains",
          },
        ]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    expect(screen.getByText("1 edges visible")).toBeInTheDocument();
    expect(screen.getByText("Document One -> Concept One (contains)")).toBeInTheDocument();
  });

  it("exposes a distinct accessible name for graph-node buttons", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:document:doc-1",
            rawId: "doc-1",
            kind: "document",
            label: "Document One",
            documentId: "doc-1",
            searchText: "document one",
          },
        ]}
        edges={[]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    expect(screen.getByRole("button", { name: "Select graph node Document One" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Document One" })).not.toBeInTheDocument();
  });

  it("marks the selected graph node button as current without toggle semantics", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:document:doc-1",
            rawId: "doc-1",
            kind: "document",
            label: "Document One",
            documentId: "doc-1",
            searchText: "document one",
          },
        ]}
        edges={[]}
        matchedNodeIds={[]}
        selectedNodeId="doc-1:document:doc-1"
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    expect(screen.getByRole("button", { name: "Select graph node Document One" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Select graph node Document One" })).not.toHaveAttribute("aria-pressed");
  });

  it("distinguishes repeated labels in graph nodes and visible edges", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:concept:topic-1",
            rawId: "topic-1",
            kind: "concept",
            label: "Topic",
            documentId: "doc-1",
            searchText: "topic",
          },
          {
            id: "doc-2:concept:topic-2",
            rawId: "topic-2",
            kind: "concept",
            label: "Topic",
            documentId: "doc-2",
            searchText: "topic",
          },
        ]}
        edges={[
          {
            source: "doc-1:concept:topic-1",
            target: "doc-2:concept:topic-2",
            rawSource: "topic-1",
            rawTarget: "topic-2",
            type: "supports",
          },
        ]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    const graphCanvas = screen.getByRole("region", { name: "Graph canvas" });
    const nodeButtons = within(graphCanvas).getAllByRole("button", {
      name: /Select graph node Topic \(doc-/,
    });

    expect(nodeButtons).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Select graph node Topic (doc-1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Topic (doc-2)" })).toBeInTheDocument();
    expect(screen.getByText("Topic (doc-1) -> Topic (doc-2) (supports)")).toBeInTheDocument();
  });

  it("distinguishes repeated labels within the same document", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:concept:topic-1",
            rawId: "topic-1",
            kind: "concept",
            label: "Topic",
            documentId: "doc-1",
            searchText: "topic",
          },
          {
            id: "doc-1:concept:topic-2",
            rawId: "topic-2",
            kind: "concept",
            label: "Topic",
            documentId: "doc-1",
            searchText: "topic",
          },
        ]}
        edges={[
          {
            source: "doc-1:concept:topic-1",
            target: "doc-1:concept:topic-2",
            rawSource: "topic-1",
            rawTarget: "topic-2",
            type: "supports",
          },
        ]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    expect(screen.getByRole("button", { name: "Select graph node Topic (doc-1):topic-1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Topic (doc-1):topic-2" })).toBeInTheDocument();
    expect(screen.getByText("Topic (doc-1):topic-1 -> Topic (doc-1):topic-2 (supports)")).toBeInTheDocument();
  });

  it("distinguishes repeated labels and raw ids within the same document when kinds differ", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:concept:topic-1",
            rawId: "topic-1",
            kind: "concept",
            label: "Topic",
            documentId: "doc-1",
            searchText: "topic",
          },
          {
            id: "doc-1:question:topic-1",
            rawId: "topic-1",
            kind: "question",
            label: "Topic",
            documentId: "doc-1",
            searchText: "topic",
          },
        ]}
        edges={[
          {
            source: "doc-1:concept:topic-1",
            target: "doc-1:question:topic-1",
            rawSource: "topic-1",
            rawTarget: "topic-1",
            type: "supports",
          },
        ]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    expect(screen.getByRole("button", { name: "Select graph node Topic (doc-1):topic-1:concept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Topic (doc-1):topic-1:question" })).toBeInTheDocument();
    expect(screen.getByText("Topic (doc-1):topic-1:concept -> Topic (doc-1):topic-1:question (supports)")).toBeInTheDocument();
  });

  it("keeps disambiguation correct when labels, document ids, and raw ids contain colons", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "topic-1",
            rawId: "raw:1",
            kind: "concept",
            label: "Topic",
            documentId: "doc:1",
            searchText: "topic",
          },
          {
            id: "topic-2",
            rawId: "raw:2",
            kind: "concept",
            label: "Topic",
            documentId: "doc-2",
            searchText: "topic",
          },
          {
            id: "topic-3",
            rawId: "raw:1",
            kind: "concept",
            label: "Topic:doc",
            documentId: "1",
            searchText: "topic doc",
          },
        ]}
        edges={[
          {
            source: "topic-1",
            target: "topic-2",
            rawSource: "raw:1",
            rawTarget: "raw:2",
            type: "supports",
          },
        ]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
      />,
    );

    expect(screen.getByRole("button", { name: "Select graph node Topic (doc:1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Topic (doc-2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Topic:doc" })).toBeInTheDocument();
    expect(screen.getByText("Topic (doc:1) -> Topic (doc-2) (supports)")).toBeInTheDocument();
  });

  it("disables graph-node selection when interaction is unavailable", () => {
    render(
      <GraphCanvas
        nodes={[
          {
            id: "doc-1:document:doc-1",
            rawId: "doc-1",
            kind: "document",
            label: "Document One",
            documentId: "doc-1",
            searchText: "document one",
          },
        ]}
        edges={[]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
        disabled
      />,
    );

    expect(screen.getByRole("button", { name: "Select graph node Document One" })).toBeDisabled();
  });
});
