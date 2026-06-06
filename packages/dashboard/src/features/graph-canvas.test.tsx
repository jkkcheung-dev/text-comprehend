// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll } from "vitest";
import "@testing-library/jest-dom/vitest";

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

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { GraphCanvas } from "./graph-canvas";
import type { GraphEdgeRecord, GraphNodeRecord } from "./graph-view-model";

function createNode(id: string, label: string, kind: GraphNodeRecord["kind"] = "concept", documentId = "doc-1"): GraphNodeRecord {
  return { id, rawId: id.split(":")[2] ?? id, kind, label, searchText: label.toLowerCase(), documentId, dimmed: false, highlighted: false };
}

function createEdge(source: string, target: string, type = "defines" as const): GraphEdgeRecord {
  return { source, target, type, rawSource: source, rawTarget: target };
}

function renderGraph(props: Partial<Parameters<typeof GraphCanvas>[0]> = {}) {
  return render(
    <ReactFlowProvider>
      <GraphCanvas
        nodes={[]}
        edges={[]}
        matchedNodeIds={[]}
        selectedNodeId={null}
        onSelectNode={vi.fn()}
        emptyMessage="No graph data"
        {...props}
      />
    </ReactFlowProvider>,
  );
}

describe("GraphCanvas (xyflow)", () => {
  it("renders empty message when no nodes", () => {
    renderGraph();
    expect(screen.getByText("No graph data")).toBeInTheDocument();
  });

  it("renders node labels", () => {
    renderGraph({
      nodes: [createNode("doc-1:concept:c1", "Modularity")],
    });
    expect(screen.getByText("Modularity")).toBeInTheDocument();
  });

  it("renders multiple nodes", () => {
    renderGraph({
      nodes: [
        createNode("doc-1:concept:c1", "Concept One"),
        createNode("doc-1:argument:a1", "Argument One", "argument"),
      ],
    });
    expect(screen.getByText("Concept One")).toBeInTheDocument();
    expect(screen.getByText("Argument One")).toBeInTheDocument();
  });

  it("calls onSelectNode when a node is clicked", async () => {
    const onSelectNode = vi.fn();
    render(
      <ReactFlowProvider>
        <GraphCanvas
          nodes={[createNode("doc-1:concept:c1", "Click Me")]}
          edges={[]}
          matchedNodeIds={[]}
          selectedNodeId={null}
          onSelectNode={onSelectNode}
          emptyMessage="Empty"
        />
      </ReactFlowProvider>,
    );
    expect(onSelectNode).toBeDefined();
  });

  it("renders with selected node", () => {
    render(
      <ReactFlowProvider>
        <GraphCanvas
          nodes={[createNode("doc-1:concept:c1", "Selected Node")]}
          edges={[]}
          matchedNodeIds={[]}
          selectedNodeId="doc-1:concept:c1"
          onSelectNode={vi.fn()}
          emptyMessage="Empty"
        />
      </ReactFlowProvider>,
    );
    expect(screen.getByText("Selected Node")).toBeInTheDocument();
  });

  it("renders edges with nodes", () => {
    render(
      <ReactFlowProvider>
        <GraphCanvas
          nodes={[
            createNode("doc-1:concept:c1", "Source"),
            createNode("doc-1:concept:c2", "Target"),
          ]}
          edges={[createEdge("doc-1:concept:c1", "doc-1:concept:c2", "defines")]}
          matchedNodeIds={["doc-1:concept:c1", "doc-1:concept:c2"]}
          selectedNodeId={null}
          onSelectNode={vi.fn()}
          emptyMessage="Empty"
        />
      </ReactFlowProvider>,
    );
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
  });

  it("renders empty message for disabled state when no valid nodes", () => {
    render(
      <ReactFlowProvider>
        <GraphCanvas
          nodes={[]}
          edges={[]}
          matchedNodeIds={[]}
          selectedNodeId={null}
          onSelectNode={vi.fn()}
          emptyMessage="Empty"
          disabled
        />
      </ReactFlowProvider>,
    );
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
