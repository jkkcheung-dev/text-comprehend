// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, children }: any) => (
    <div data-testid="react-flow">
      {nodes?.map((n: any) => (
        <div key={n.id} data-testid="rf-node">{n.data?.label ?? n.id}</div>
      ))}
      {children}
    </div>
  ),
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  useNodesState: (initial: any) => [initial, {}, vi.fn()],
  useEdgesState: (initial: any) => [initial, {}, vi.fn()],
}));

const mockStore = vi.fn();
vi.mock("../store/dashboard-store", () => ({
  useDashboardStore: (selector: any) => selector(mockStore()),
}));

import {
  createAvailableDetail,
  createDocument,
  createMalformedDashboardData,
  createReadyDashboardData,
  createWorkspaceSource,
} from "../test/factories";
import { createDefaultFacetState } from "./graph-view-model";
import { DashboardShell } from "./dashboard-shell";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function setupStore(overrides: Record<string, unknown> = {}) {
  const defaults = {
    data: null,
    searchQuery: "",
    facets: createDefaultFacetState(),
    selectedNodeId: null,
    setSearchQuery: vi.fn(),
    toggleFacet: vi.fn(),
    selectNode: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  };
  mockStore.mockReturnValue(defaults);
  return defaults;
}

describe("DashboardShell", () => {
  it("renders Text Comprehend header and source badge when ready", () => {
    const readyData = createReadyDashboardData();
    setupStore({
      data: readyData,
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByText("Text Comprehend")).toBeInTheDocument();
    expect(screen.getByText("Fixture")).toBeInTheDocument();
  });

  it("shows loading state when data is loading", () => {
    setupStore({
      data: { state: "loading", source: createWorkspaceSource("/repo").meta },
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
  });

  it("shows empty state message", () => {
    setupStore({
      data: { state: "empty", source: createWorkspaceSource("/repo").meta },
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByText(/Run \/comprehend/)).toBeInTheDocument();
  });

  it("shows malformed alert when data is malformed", () => {
    setupStore({
      data: createMalformedDashboardData(),
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByRole("alert")).toHaveTextContent("Dashboard data could not be loaded");
  });

  it("renders null when data is null", () => {
    setupStore({
      data: null,
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    const { container } = render(<DashboardShell />);
    expect(container.innerHTML).toBe("");
  });

  it("renders document list in sidebar when ready", () => {
    const readyData = createReadyDashboardData({
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });
    setupStore({
      data: readyData,
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByRole("button", { name: "Document One" })).toBeInTheDocument();
  });

  it("renders FacetToggleGroup inside the sidebar", () => {
    const readyData = createReadyDashboardData();
    setupStore({
      data: readyData,
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByRole("group", { name: "Visible Node Types" })).toBeInTheDocument();
  });

  it("shows workspace root for workspace source", () => {
    const readyData = createReadyDashboardData({
      source: createWorkspaceSource("/repo").meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });
    setupStore({
      data: readyData,
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    const repoEls = screen.getAllByText("/repo");
    expect(repoEls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders detail panel with first document when ready", () => {
    const readyData = createReadyDashboardData({
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });
    setupStore({
      data: readyData,
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
    });

    render(<DashboardShell />);

    expect(screen.getByText("Layered Summary")).toBeInTheDocument();
  });

  it("calls selectNode when a document button is clicked", () => {
    const selectNode = vi.fn();
    const readyData = createReadyDashboardData({
      documents: [
        createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
      ],
    });
    setupStore({
      data: readyData,
      searchQuery: "",
      facets: createDefaultFacetState(),
      selectedNodeId: null,
      selectNode,
    });

    render(<DashboardShell />);

    fireEvent.click(screen.getByRole("button", { name: "Document One" }));
    expect(selectNode).toHaveBeenCalled();
  });
});
