// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAvailableDetail,
  createConcept,
  createDocument,
  createGraphEdge,
  createMalformedDashboardData,
  createReadyDashboardData,
  createWorkspaceSource,
} from "../test/factories";
import { createDefaultFacetState } from "./graph-view-model";
import { DashboardShell } from "./dashboard-shell";

afterEach(() => {
  cleanup();
});

const defaultShellProps = {
  selectedDocumentId: null,
  selectedNodeId: null,
  onSelectDocument: () => {},
};

describe("DashboardShell", () => {
  it("wires search, facet, and graph selection controls when ready", () => {
    const onSearchQueryChange = vi.fn();
    const onResetSearch = vi.fn();
    const onFacetChange = vi.fn();
    const onSelectDocument = vi.fn();
    const onSelectNode = vi.fn();
    const onViewStateChange = vi.fn();
    const readyData = createReadyDashboardData();

    render(
      <DashboardShell
        data={readyData}
        graph={{
          nodes: [
            {
              id: "doc-1:document:doc-1",
              rawId: "doc-1",
              kind: "document",
              label: "Document One",
              documentId: "doc-1",
              searchText: "document one",
            },
          ],
          matchedNodeIds: ["doc-1:document:doc-1"],
          visibleEdges: [],
        }}
        searchQuery="doc"
        facets={createDefaultFacetState()}
        selectedDocumentId="doc-1"
        selectedNodeId="doc-1:document:doc-1"
        onSearchQueryChange={onSearchQueryChange}
        onResetSearch={onResetSearch}
        onFacetChange={onFacetChange}
        onSelectDocument={onSelectDocument}
        onSelectNode={onSelectNode}
        viewState={{ zoom: 1, offsetX: 0, offsetY: 0 }}
        onViewStateChange={onViewStateChange}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search graph" }), {
      target: { value: "document" },
    });
    expect(onSearchQueryChange).toHaveBeenCalledWith("document");

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onResetSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("checkbox", { name: "Questions" }));
    expect(onFacetChange).toHaveBeenCalledWith("questions", false);

    fireEvent.click(screen.getByRole("button", { name: "Document One" }));
    expect(onSelectDocument).toHaveBeenCalledWith("doc-1");

    fireEvent.click(
      within(screen.getByRole("region", { name: "Graph canvas" })).getByRole("button", {
        name: "Select graph node Document One",
      }),
    );
    expect(onSelectNode).toHaveBeenCalledWith("doc-1:document:doc-1");

    expect(screen.getByText("Zoom: 1.0x")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onViewStateChange).toHaveBeenCalledWith({ zoom: 1.2, offsetX: 0, offsetY: 0 });

    expect(screen.getByRole("region", { name: "Graph canvas" })).toBeInTheDocument();
    expect(screen.getByText("0 edges visible")).toBeInTheDocument();
  });

  it("renders refresh and retry controls for ready data warnings", () => {
    const onRefresh = vi.fn();
    const onRetry = vi.fn();
    const readyData = createReadyDashboardData({
      source: createWorkspaceSource("/repo").meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    render(
      <DashboardShell
        data={readyData}
        {...defaultShellProps}
        onRefresh={onRefresh}
        refreshWarning="Dashboard data may be stale."
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("status")).toHaveTextContent("Dashboard data may be stale.");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("suppresses the ready-only refresh control when dashboard data is not ready", () => {
    render(
      <DashboardShell
        data={createMalformedDashboardData()}
        {...defaultShellProps}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Refresh data" })).not.toBeInTheDocument();
  });

  it("renders warning and retry controls when data is not ready", () => {
    const onRetry = vi.fn();
    const malformedData = createMalformedDashboardData();

    render(
      <DashboardShell
        data={malformedData}
        {...defaultShellProps}
        refreshWarning="Dashboard data may be stale."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Dashboard data may be stale.");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("announces malformed load failures with alert semantics", () => {
    render(
      <DashboardShell
        data={createMalformedDashboardData()}
        {...defaultShellProps}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Dashboard data could not be loaded");
  });

  it("exposes which document is currently selected", () => {
    const readyData = createReadyDashboardData({
      documents: [
        createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
        createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
      ],
    });

    render(
      <DashboardShell
        data={readyData}
        {...defaultShellProps}
        selectedDocumentId="doc-2"
      />,
    );

    expect(screen.getByRole("button", { name: "Document One" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Document One" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Document Two" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Document Two" })).toHaveAttribute("aria-current", "true");
  });

  it("marks the fallback detail document selected when selectedDocumentId is null", () => {
    const readyData = createReadyDashboardData({
      documents: [
        createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
        createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
      ],
    });

    render(<DashboardShell data={readyData} {...defaultShellProps} selectedDocumentId={null} />);

    expect(screen.getByText("# Document One")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document One" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Document One" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Document Two" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Document Two" })).not.toHaveAttribute("aria-pressed");
  });

  it("marks the displayed fallback detail document selected when selectedDocumentId is missing", () => {
    const readyData = createReadyDashboardData({
      documents: [
        createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
        createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
      ],
    });

    render(<DashboardShell data={readyData} {...defaultShellProps} selectedDocumentId="missing-doc" />);

    expect(screen.getByText("# Document One")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document One" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Document One" })).not.toHaveAttribute("aria-pressed");
    expect(screen.getByRole("button", { name: "Document Two" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Document Two" })).not.toHaveAttribute("aria-pressed");
  });

  it("distinguishes duplicate document titles in the document list", () => {
    const readyData = createReadyDashboardData({
      documents: [
        createDocument("doc-1", "Overview", createAvailableDetail("# First Overview")),
        createDocument("doc-2", "Overview", createAvailableDetail("# Second Overview")),
      ],
    });

    render(<DashboardShell data={readyData} {...defaultShellProps} selectedDocumentId="doc-1" />);

    expect(screen.getByRole("button", { name: "Overview (docs/doc-1.md)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview (docs/doc-2.md)" })).toBeInTheDocument();
  });

  it("renders only documents in the current graph working set", () => {
    const readyData = createReadyDashboardData({
      documents: [
        createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
        createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
      ],
    });

    render(
      <DashboardShell
        data={readyData}
        {...defaultShellProps}
        graph={{
          nodes: [
            {
              id: "doc-2:document:doc-2",
              rawId: "doc-2",
              kind: "document",
              label: "Document Two",
              documentId: "doc-2",
              searchText: "document two",
            },
          ],
          matchedNodeIds: ["doc-2:document:doc-2"],
          visibleEdges: [],
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Document One" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document Two" })).toBeInTheDocument();
  });

  it("disables non-wired controls and makes the preview state explicit", () => {
    const readyData = createReadyDashboardData();

    render(<DashboardShell data={readyData} {...defaultShellProps} selectedDocumentId="doc-1" />);

    expect(screen.getByText("Search, facet filters, and graph node selection will be available after app wiring lands.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search graph" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Documents" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Concepts" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Arguments" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Questions" })).toBeDisabled();
    expect(
      within(screen.getByRole("region", { name: "Graph canvas" })).getByRole("button", {
        name: "Select graph node Document One",
      }),
    ).toBeDisabled();
  });

  it("builds the graph view-model when no graph prop is injected", () => {
    const readyData = createReadyDashboardData({
      documents: [
        {
          ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
          concepts: [createConcept("concept-1", "Concept One")],
        },
      ],
      graphEdges: [createGraphEdge("doc-1", "concept-1", "contains")],
    });

    render(<DashboardShell data={readyData} {...defaultShellProps} selectedDocumentId="doc-1" />);

    expect(screen.getByRole("region", { name: "Graph canvas" })).toBeInTheDocument();
    expect(screen.getByText("1 edges visible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Document One" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Concept One" })).toBeInTheDocument();
    expect(screen.getByText("Document One -> Concept One (contains)")).toBeInTheDocument();
  });

  it("shows the graph fallback message when the graph view-model provides one", () => {
    const readyData = createReadyDashboardData({
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    render(
      <DashboardShell
        data={readyData}
        {...defaultShellProps}
        searchQuery=""
        facets={createDefaultFacetState()}
        graph={{
          nodes: [],
          matchedNodeIds: [],
          visibleEdges: [],
          renderMessage: "Graph view unavailable for the current selection.",
        }}
        onSearchQueryChange={() => {}}
        onResetSearch={() => {}}
        onFacetChange={() => {}}
        onSelectNode={() => {}}
        viewState={{ zoom: 1, offsetX: 0, offsetY: 0 }}
        onViewStateChange={() => {}}
      />,
    );

    expect(screen.getByText("Graph view unavailable for the current selection.")).toBeInTheDocument();
    expect(screen.queryByText("No graph matches the current search and facet filters.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document One" })).toBeInTheDocument();
    expect(screen.getByText("dashboard-workspace")).toBeInTheDocument();
  });
});
