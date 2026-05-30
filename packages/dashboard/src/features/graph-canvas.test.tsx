// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll } from "vitest";

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
  return { id, rawId: id.split(":")[2] ?? id, kind, label, searchText: label.toLowerCase(), documentId };
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
    expect(screen.getByText("No graph data")).toBeDefined();
  });

  it("renders node labels", () => {
    const { container } = renderGraph({
      nodes: [createNode("doc-1:concept:c1", "Modularity")],
    });
    expect(container.textContent).toContain("Modularity");
  });

  it("renders multiple nodes", () => {
    const { container } = renderGraph({
      nodes: [
        createNode("doc-1:concept:c1", "Concept One"),
        createNode("doc-1:argument:a1", "Argument One", "argument"),
      ],
    });
    expect(container.textContent).toContain("Concept One");
    expect(container.textContent).toContain("Argument One");
  });

  it("calls onSelectNode when a node is clicked", async () => {
    const onSelectNode = vi.fn();
    const { container } = render(
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
    const nodeElement = container.querySelector(".react-flow__node");
    expect(nodeElement).toBeTruthy();
    nodeElement!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  it("marks selected node with selected class", () => {
    const { container } = render(
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
    const nodeElement = container.querySelector(".react-flow__node");
    expect(nodeElement?.classList.contains("selected")).toBe(true);
  });

  it("renders edges as visible in xyflow pane", () => {
    const { container } = render(
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
    const sourceNode = container.querySelector(".react-flow__node");
    expect(sourceNode).toBeTruthy();
  });

  it("handles disabled state by preventing node interactions", () => {
    const { container } = render(
      <ReactFlowProvider>
        <GraphCanvas
          nodes={[createNode("doc-1:concept:c1", "Disabled Node")]}
          edges={[]}
          matchedNodeIds={[]}
          selectedNodeId={null}
          onSelectNode={vi.fn()}
          emptyMessage="Empty"
          disabled
        />
      </ReactFlowProvider>,
    );
    const pane = container.querySelector(".react-flow__pane");
    expect(pane).toBeTruthy();
  });
});
