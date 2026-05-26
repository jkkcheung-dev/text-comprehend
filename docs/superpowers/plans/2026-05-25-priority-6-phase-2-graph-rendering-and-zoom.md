# Priority 6 Phase 2 Graph Rendering And Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Phase 1 graph-first dashboard foundation with real graph rendering polish, scoped graph fallbacks, and hybrid zoom behavior that changes both scale and label density.

**Architecture:** Build on Phase 1’s shared selection and graph view-model layer instead of redesigning it. Extend the graph canvas with explicit view-state handling for pan and zoom, add zoom-threshold display rules in pure helpers, and keep graph-specific failures scoped to the graph panel so the rest of the ready dashboard remains usable.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, jsdom, Vite

---

## File Map

- Modify: `packages/dashboard/src/features/graph-view-model.ts`
  - Add zoom-threshold display helpers and graph-render validation.
- Modify: `packages/dashboard/src/features/graph-view-model.test.ts`
  - Cover zoom-density rules and invalid-render fallbacks.
- Modify: `packages/dashboard/src/features/graph-canvas.tsx`
  - Add pan/zoom state, zoom controls, and zoom-aware label rendering.
- Modify: `packages/dashboard/src/features/graph-canvas.test.tsx`
  - Cover zoom controls, selected-node emphasis, and graph fallback rendering.
- Modify: `packages/dashboard/src/features/dashboard-shell.tsx`
  - Surface graph fallback messaging and pass zoom state through.
- Modify: `packages/dashboard/src/features/dashboard-shell.test.tsx`
  - Cover graph fallback and zoom-control visibility.
- Modify: `packages/dashboard/src/App.tsx`
  - Own graph view state and reset it safely on source change.
- Modify: `packages/dashboard/src/App.test.tsx`
  - Cover graph view-state reset and end-to-end zoom-driven rendering behavior.

## Task 1: Add Zoom Threshold And Render Validation Helpers

**Files:**
- Modify: `packages/dashboard/src/features/graph-view-model.ts`
- Modify: `packages/dashboard/src/features/graph-view-model.test.ts`

- [ ] **Step 1: Write the failing zoom-threshold tests**

```ts
import { describe, expect, it } from "vitest";
import { getZoomBucket, getNodeLabelMode, validateRenderableGraph } from "./graph-view-model";

describe("graph zoom rules", () => {
  it("maps zoom values into stable buckets", () => {
    expect(getZoomBucket(0.7)).toBe("far");
    expect(getZoomBucket(1)).toBe("mid");
    expect(getZoomBucket(1.8)).toBe("near");
  });

  it("shows richer labels only when zoomed in", () => {
    expect(getNodeLabelMode("far")).toBe("minimal");
    expect(getNodeLabelMode("near")).toBe("detailed");
  });

  it("flags empty renderable graphs", () => {
    expect(validateRenderableGraph({ nodes: [], visibleEdges: [], matchedNodeIds: [] }).state).toBe("invalid");
  });
});
```

- [ ] **Step 2: Run the graph view-model tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/features/graph-view-model.test.ts`
Expected: FAIL because the zoom helpers and validation do not exist yet.

- [ ] **Step 3: Add the zoom-threshold and render-validation helpers**

```ts
export type GraphZoomBucket = "far" | "mid" | "near";

export function getZoomBucket(zoom: number): GraphZoomBucket {
  if (zoom < 0.85) return "far";
  if (zoom > 1.4) return "near";
  return "mid";
}

export function getNodeLabelMode(bucket: GraphZoomBucket): "minimal" | "standard" | "detailed" {
  if (bucket === "far") return "minimal";
  if (bucket === "near") return "detailed";
  return "standard";
}

export function validateRenderableGraph(model: { nodes: unknown[]; visibleEdges: unknown[]; matchedNodeIds: string[] }) {
  return model.nodes.length === 0
    ? { state: "invalid" as const, message: "Graph view unavailable for the current selection." }
    : { state: "valid" as const };
}
```

- [ ] **Step 4: Re-run the graph view-model tests**

Run: `npx vitest run packages/dashboard/src/features/graph-view-model.test.ts`
Expected: PASS

## Task 2: Add Pan/Zoom Controls To The Graph Canvas

**Files:**
- Modify: `packages/dashboard/src/features/graph-canvas.tsx`
- Modify: `packages/dashboard/src/features/graph-canvas.test.tsx`

- [ ] **Step 1: Write the failing graph-canvas zoom tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { GraphCanvas } from "./graph-canvas";

describe("GraphCanvas zoom", () => {
  it("invokes zoom change handlers and changes label density", () => {
    const onViewChange = vi.fn();
    render(
      <GraphCanvas
        nodes={[{ id: "doc-1", kind: "document", label: "Document One", documentId: "doc-1", searchText: "document one" }]}
        edges={[]}
        matchedNodeIds={["doc-1"]}
        selectedNodeId="doc-1"
        onSelectNode={() => {}}
        emptyMessage="No graph matches."
        viewState={{ zoom: 1, offsetX: 0, offsetY: 0 }}
        onViewStateChange={onViewChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onViewChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the graph-canvas tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/features/graph-canvas.test.tsx`
Expected: FAIL because the current graph canvas has no zoom view-state contract.

- [ ] **Step 3: Add pan/zoom state and zoom-aware labels**

```tsx
// add these view-state and zoom rules inside packages/dashboard/src/features/graph-canvas.tsx
import { getNodeLabelMode, getZoomBucket, validateRenderableGraph } from "./graph-view-model";

type GraphViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const renderState = validateRenderableGraph({ nodes, visibleEdges: edges, matchedNodeIds });
if (renderState.state === "invalid") {
  return <p>{renderState.message}</p>;
}

const zoomBucket = getZoomBucket(viewState.zoom);
const labelMode = getNodeLabelMode(zoomBucket);

<button type="button" onClick={() => onViewStateChange({ ...viewState, zoom: Math.min(viewState.zoom + 0.2, 2) })}>Zoom in</button>
<button type="button" onClick={() => onViewStateChange({ ...viewState, zoom: Math.max(viewState.zoom - 0.2, 0.6) })}>Zoom out</button>

{nodes.map((node) => (
  <button key={node.id} type="button" onClick={() => onSelectNode(node.id)}>
    {labelMode === "minimal" ? node.kind : node.label}
  </button>
))}
```

- [ ] **Step 4: Re-run the graph-canvas tests**

Run: `npx vitest run packages/dashboard/src/features/graph-canvas.test.tsx`
Expected: PASS

## Task 3: Wire Graph View State Through App And Shell

**Files:**
- Modify: `packages/dashboard/src/App.tsx`
- Modify: `packages/dashboard/src/App.test.tsx`
- Modify: `packages/dashboard/src/features/dashboard-shell.tsx`
- Modify: `packages/dashboard/src/features/dashboard-shell.test.tsx`

- [ ] **Step 1: Write the failing app and shell tests**

```tsx
it("resets graph zoom to the default when the source changes", async () => {
  const view = render(<App source={createFixtureSource()} loadData={async () => createReadyDashboardData()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Zoom in" }));
  view.rerender(<App source={createWorkspaceSource("/repo")} loadData={async () => createReadyDashboardData({ source: createWorkspaceSource("/repo").meta })} />);
  expect(screen.getByText("Zoom: 1.0x")).toBeInTheDocument();
});

it("shows the graph fallback message when the graph view model is invalid", () => {
  render(
    <DashboardShell
      data={createReadyDashboardData()}
      graph={{ nodes: [], matchedNodeIds: [], visibleEdges: [] }}
      graphRenderMessage="Graph view unavailable for the current selection."
      viewState={{ zoom: 1, offsetX: 0, offsetY: 0 }}
      selectedDocumentId={null}
      selectedNodeId={null}
      searchQuery=""
      facets={{ documents: true, concepts: true, arguments: true, questions: true }}
      onSearchQueryChange={vi.fn()}
      onResetSearch={vi.fn()}
      onFacetChange={vi.fn()}
      onSelectDocument={vi.fn()}
      onSelectNode={vi.fn()}
      onViewStateChange={vi.fn()}
    />,
  );

  expect(screen.getByText("Graph view unavailable for the current selection.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the app and shell tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/App.test.tsx packages/dashboard/src/features/dashboard-shell.test.tsx`
Expected: FAIL because the app does not yet own graph view state or reset it on source changes.

- [ ] **Step 3: Add graph view-state ownership and shell plumbing**

```tsx
// add this graph view-state ownership inside packages/dashboard/src/App.tsx
const defaultGraphViewState = { zoom: 1, offsetX: 0, offsetY: 0 };
const [graphViewState, setGraphViewState] = useState(defaultGraphViewState);

useEffect(() => {
  setGraphViewState(defaultGraphViewState);
}, [sourceKey]);
```

```tsx
// add this zoom display and graph plumbing inside packages/dashboard/src/features/dashboard-shell.tsx
<p>{`Zoom: ${viewState.zoom.toFixed(1)}x`}</p>
<GraphCanvas
  nodes={graph.nodes}
  edges={graph.visibleEdges}
  matchedNodeIds={graph.matchedNodeIds}
  selectedNodeId={selectedNodeId}
  onSelectNode={onSelectNode}
  emptyMessage={graphRenderMessage ?? "No graph matches the current search and facet filters."}
  viewState={viewState}
  onViewStateChange={onViewStateChange}
/>
```

- [ ] **Step 4: Re-run the app and shell tests**

Run: `npx vitest run packages/dashboard/src/App.test.tsx packages/dashboard/src/features/dashboard-shell.test.tsx`
Expected: PASS

## Task 4: Verify Hybrid Zoom Behavior End To End

**Files:**
- Modify: `packages/dashboard/src/App.test.tsx`
- Modify: `packages/dashboard/src/features/graph-canvas.test.tsx`

- [ ] **Step 1: Add failing end-to-end zoom behavior assertions**

```tsx
it("shows minimal labels when zoomed out and detailed labels when zoomed in", async () => {
  render(<App source={createFixtureSource()} loadData={async () => createReadyDashboardData()} />);

  expect(await screen.findByText("Document One")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  expect(screen.getByText("document")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("Document One")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the zoom-focused tests to verify they fail if label density is not changing yet**

Run: `npx vitest run packages/dashboard/src/App.test.tsx packages/dashboard/src/features/graph-canvas.test.tsx`
Expected: FAIL only until the zoom thresholds are wired through the graph canvas; after implementation, the suite should pass.

- [ ] **Step 3: Adjust the graph canvas label rendering until the zoom tests pass**

```tsx
// use this label rendering branch inside packages/dashboard/src/features/graph-canvas.tsx
function renderNodeLabel(node: GraphNodeRecord, labelMode: "minimal" | "standard" | "detailed") {
  if (labelMode === "minimal") {
    return node.kind;
  }
  if (labelMode === "detailed") {
    return `${node.label} (${node.kind})`;
  }
  return node.label;
}
```

- [ ] **Step 4: Re-run the zoom-focused tests**

Run: `npx vitest run packages/dashboard/src/App.test.tsx packages/dashboard/src/features/graph-canvas.test.tsx`
Expected: PASS

## Task 5: Run Phase 2 Verification

**Files:**
- No code changes expected in this task.

- [ ] **Step 1: Run focused dashboard tests for graph rendering and zoom behavior**

Run: `npx vitest run packages/dashboard/src/App.test.tsx packages/dashboard/src/features/dashboard-shell.test.tsx packages/dashboard/src/features/detail-panel-shell.test.tsx packages/dashboard/src/features/search-controls.test.tsx packages/dashboard/src/features/facet-toggle-group.test.tsx packages/dashboard/src/features/graph-canvas.test.tsx packages/dashboard/src/features/graph-view-model.test.ts packages/dashboard/src/data/load-dashboard-data.test.ts packages/dashboard/src/main.test.ts`
Expected: PASS

- [ ] **Step 2: Run dashboard package typecheck**

Run: `npm run typecheck --workspace @text-comprehend/dashboard`
Expected: PASS

- [ ] **Step 3: Run dashboard package build**

Run: `npm run build --workspace @text-comprehend/dashboard`
Expected: PASS

- [ ] **Step 4: Confirm scope stayed limited to graph rendering polish and hybrid zoom**

Check that the final diff does **not** add:

```text
- backend graph-schema changes
- clustering or graph summarization
- saved views or explore/inspect modes
- background refresh or polling
- a second search system separate from the global search
```

- [ ] **Step 5: Leave the branch ready for review**

Run: `git status --short`
Expected: only the intended dashboard files and saved plan/spec docs are modified.
