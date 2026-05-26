# Priority 6 Phase 1 Graph Search Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a usable graph-first dashboard foundation with global search, facet toggles, synchronized selection, enriched detail-panel behavior, and a basic interactive graph surface.

**Architecture:** Keep `packages/dashboard/src/App.tsx` as the state owner. Add dashboard-local graph view-model helpers that flatten `KnowledgeGraph` into renderable/searchable entities, then wire search, facet, list, graph, and detail panel around one shared selection model. Use a deliberately simple graph surface in this phase so the dashboard becomes functionally useful before hybrid zoom and rendering polish arrive in Phase 2.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, jsdom, Vite

---

## File Map

- Create: `packages/dashboard/src/features/graph-view-model.ts`
  - Flatten dashboard graph data into searchable node records, visible edges, and selection helpers.
- Create: `packages/dashboard/src/features/graph-view-model.test.ts`
  - Cover graph flattening, search matching, facet filtering, and selection resolution.
- Create: `packages/dashboard/src/features/search-controls.tsx`
  - Render the global search input and reset affordance.
- Create: `packages/dashboard/src/features/search-controls.test.tsx`
  - Cover query updates and reset behavior.
- Create: `packages/dashboard/src/features/facet-toggle-group.tsx`
  - Render document/concept/argument/question visibility toggles.
- Create: `packages/dashboard/src/features/facet-toggle-group.test.tsx`
  - Cover toggle state changes.
- Create: `packages/dashboard/src/features/graph-canvas.tsx`
  - Render a basic clickable graph surface from derived nodes and edges.
- Create: `packages/dashboard/src/features/graph-canvas.test.tsx`
  - Cover node rendering, selection, and empty-result fallback.
- Modify: `packages/dashboard/src/features/detail-panel-shell.tsx`
  - Expand panel rendering for document, concept, argument, and question selection.
- Modify: `packages/dashboard/src/features/detail-panel-shell.test.tsx`
  - Add branch coverage for all supported node families and degraded document detail.
- Modify: `packages/dashboard/src/features/dashboard-shell.tsx`
  - Replace placeholder search/facet/graph sections with real controls and graph surface.
- Modify: `packages/dashboard/src/features/dashboard-shell.test.tsx`
  - Cover new shell control wiring.
- Modify: `packages/dashboard/src/App.tsx`
  - Add search, facets, selected node, derived selected document, and synchronized graph/list behavior.
- Modify: `packages/dashboard/src/App.test.tsx`
  - Add app-level synchronization tests.
- Modify: `packages/dashboard/src/test/factories.ts`
  - Add helpers for concept, argument, question, graph edges, and richer ready-data fixtures.

## Task 1: Add Graph View-Model Helpers

**Files:**
- Create: `packages/dashboard/src/features/graph-view-model.ts`
- Create: `packages/dashboard/src/features/graph-view-model.test.ts`
- Modify: `packages/dashboard/src/test/factories.ts`

- [ ] **Step 1: Write the failing graph view-model tests**

```ts
import { describe, expect, it } from "vitest";
import {
  buildGraphViewModel,
  createDefaultFacetState,
  getSelectedDocumentId,
} from "./graph-view-model";
import {
  createConcept,
  createArgument,
  createQuestion,
  createReadyDashboardData,
  createGraphEdge,
} from "../test/factories";

describe("graph-view-model", () => {
  it("flattens dashboard data into searchable graph nodes", () => {
    const data = createReadyDashboardData({
      graphEdges: [createGraphEdge("doc-1", "concept-1", "defines")],
      documents: [
        {
          ...createReadyDashboardData().documents[0],
          concepts: [createConcept("concept-1", "Event Loop")],
          arguments: [createArgument("argument-1", "Rendering stays responsive")],
          questions: [createQuestion("question-1", "What triggers rerendering?")],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "event",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => node.id)).toContain("concept-1");
    expect(model.matchedNodeIds).toContain("concept-1");
    expect(model.visibleEdges).toEqual([{ source: "doc-1", target: "concept-1", type: "defines" }]);
  });

  it("removes hidden facets from nodes and matches", () => {
    const data = createReadyDashboardData();
    const model = buildGraphViewModel(data, {
      searchQuery: "",
      facets: { documents: true, concepts: false, arguments: false, questions: false },
    });

    expect(model.nodes.every((node) => node.kind === "document")).toBe(true);
  });

  it("derives the selected document from a non-document node", () => {
    const data = createReadyDashboardData();
    expect(getSelectedDocumentId(data, "concept-1")).toBe("doc-1");
  });
});
```

- [ ] **Step 2: Run the graph view-model tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/features/graph-view-model.test.ts`
Expected: FAIL because `graph-view-model.ts` and the new factory helpers do not exist yet.

- [ ] **Step 3: Add richer dashboard test factories**

```ts
// add these helpers inside packages/dashboard/src/test/factories.ts
import type { Edge } from "@text-comprehend/core";

export function createConcept(id: string, name: string) {
  return {
    id,
    name,
    definition: `${name} definition`,
    importance: "core" as const,
    sourceRefs: [],
  };
}

export function createArgument(id: string, claim: string) {
  return {
    id,
    claim,
    type: "main" as const,
    evidence: [],
    assumptions: ["Assumption"],
    gaps: ["Gap"],
    sourceRefs: [],
  };
}

export function createQuestion(id: string, question: string) {
  return {
    id,
    question,
    answer: "Answer",
    difficulty: "basic" as const,
    facet: "factual" as const,
    sourceRefs: [],
  };
}

export function createGraphEdge(source: string, target: string, type: Edge["type"]): Edge {
  return { source, target, type };
}
```

- [ ] **Step 4: Add the graph view-model helpers**

```ts
// packages/dashboard/src/features/graph-view-model.ts
import type { DashboardDocument, ReadyDashboardData } from "../data/types";

export type GraphFacetState = {
  documents: boolean;
  concepts: boolean;
  arguments: boolean;
  questions: boolean;
};

export type GraphNodeRecord = {
  id: string;
  kind: "document" | "concept" | "argument" | "question";
  label: string;
  searchText: string;
  documentId: string;
};

export function createDefaultFacetState(): GraphFacetState {
  return { documents: true, concepts: true, arguments: true, questions: true };
}

export function buildGraphViewModel(
  data: ReadyDashboardData,
  options: { searchQuery: string; facets: GraphFacetState },
) {
  const nodes = data.documents.flatMap((document) => flattenDocument(document, options.facets));
  const normalizedQuery = options.searchQuery.trim().toLowerCase();
  const matchedNodeIds = normalizedQuery
    ? nodes.filter((node) => node.searchText.includes(normalizedQuery)).map((node) => node.id)
    : nodes.map((node) => node.id);
  const visibleNodes = normalizedQuery
    ? nodes.filter((node) => matchedNodeIds.includes(node.id) || node.kind === "document")
    : nodes;
  const visibleEdges = data.graph.edges.filter(
    (edge) => visibleNodes.some((node) => node.id === edge.source) && visibleNodes.some((node) => node.id === edge.target),
  );

  return { nodes: visibleNodes, matchedNodeIds, visibleEdges };
}

export function getSelectedDocumentId(data: ReadyDashboardData, selectedNodeId: string | null): string | null {
  if (!selectedNodeId) {
    return data.documents[0]?.id ?? null;
  }

  for (const document of data.documents) {
    if (document.id === selectedNodeId) {
      return document.id;
    }
    if (document.concepts.some((concept) => concept.id === selectedNodeId)) return document.id;
    if (document.arguments.some((argument) => argument.id === selectedNodeId)) return document.id;
    if (document.questions.some((question) => question.id === selectedNodeId)) return document.id;
  }

  return null;
}

function flattenDocument(document: DashboardDocument, facets: GraphFacetState): GraphNodeRecord[] {
  const nodes: GraphNodeRecord[] = [];
  if (facets.documents) {
    nodes.push({
      id: document.id,
      kind: "document",
      label: document.title,
      searchText: `${document.title} ${document.filePath}`.toLowerCase(),
      documentId: document.id,
    });
  }
  if (facets.concepts) {
    nodes.push(...document.concepts.map((concept) => ({
      id: concept.id,
      kind: "concept" as const,
      label: concept.name,
      searchText: `${concept.name} ${concept.definition}`.toLowerCase(),
      documentId: document.id,
    })));
  }
  return nodes.concat(
    facets.arguments
      ? document.arguments.map((argument) => ({
          id: argument.id,
          kind: "argument" as const,
          label: argument.claim,
          searchText: `${argument.claim} ${argument.assumptions.join(" ")} ${argument.gaps.join(" ")}`.toLowerCase(),
          documentId: document.id,
        }))
      : [],
    facets.questions
      ? document.questions.map((question) => ({
          id: question.id,
          kind: "question" as const,
          label: question.question,
          searchText: `${question.question} ${question.answer}`.toLowerCase(),
          documentId: document.id,
        }))
      : [],
  );
}
```

- [ ] **Step 5: Re-run the graph view-model tests**

Run: `npx vitest run packages/dashboard/src/features/graph-view-model.test.ts`
Expected: PASS

## Task 2: Add Search And Facet Controls

**Files:**
- Create: `packages/dashboard/src/features/search-controls.tsx`
- Create: `packages/dashboard/src/features/search-controls.test.tsx`
- Create: `packages/dashboard/src/features/facet-toggle-group.tsx`
- Create: `packages/dashboard/src/features/facet-toggle-group.test.tsx`

- [ ] **Step 1: Write the failing control tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { SearchControls } from "./search-controls";
import { FacetToggleGroup } from "./facet-toggle-group";

describe("SearchControls", () => {
  it("updates the global search query and clears it", () => {
    const onQueryChange = vi.fn();
    const onReset = vi.fn();
    render(<SearchControls query="graph" onQueryChange={onQueryChange} onReset={onReset} />);

    fireEvent.change(screen.getByLabelText("Search graph content"), { target: { value: "concept" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onQueryChange).toHaveBeenCalledWith("concept");
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("FacetToggleGroup", () => {
  it("toggles graph facet visibility", () => {
    const onFacetChange = vi.fn();
    render(
      <FacetToggleGroup
        facets={{ documents: true, concepts: true, arguments: false, questions: true }}
        onFacetChange={onFacetChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Arguments" }));
    expect(onFacetChange).toHaveBeenCalledWith("arguments", true);
  });
});
```

- [ ] **Step 2: Run the control tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/features/search-controls.test.tsx packages/dashboard/src/features/facet-toggle-group.test.tsx`
Expected: FAIL because the new control files do not exist yet.

- [ ] **Step 3: Add the search and facet components**

```tsx
// packages/dashboard/src/features/search-controls.tsx
type SearchControlsProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onReset: () => void;
};

export function SearchControls({ query, onQueryChange, onReset }: SearchControlsProps) {
  return (
    <div>
      <label>
        Search graph content
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} />
      </label>
      <button type="button" onClick={onReset}>Clear search</button>
    </div>
  );
}
```

```tsx
// packages/dashboard/src/features/facet-toggle-group.tsx
import type { GraphFacetState } from "./graph-view-model";

type FacetToggleGroupProps = {
  facets: GraphFacetState;
  onFacetChange: (facet: keyof GraphFacetState, nextValue: boolean) => void;
};

export function FacetToggleGroup({ facets, onFacetChange }: FacetToggleGroupProps) {
  return (
    <fieldset>
      <legend>Facet filters</legend>
      {Object.entries(facets).map(([facet, checked]) => (
        <label key={facet}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onFacetChange(facet as keyof GraphFacetState, event.target.checked)}
          />
          {facet[0].toUpperCase() + facet.slice(1)}
        </label>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 4: Re-run the control tests**

Run: `npx vitest run packages/dashboard/src/features/search-controls.test.tsx packages/dashboard/src/features/facet-toggle-group.test.tsx`
Expected: PASS

## Task 3: Add A Basic Interactive Graph Surface

**Files:**
- Create: `packages/dashboard/src/features/graph-canvas.tsx`
- Create: `packages/dashboard/src/features/graph-canvas.test.tsx`
- Modify: `packages/dashboard/src/features/dashboard-shell.tsx`
- Modify: `packages/dashboard/src/features/dashboard-shell.test.tsx`

- [ ] **Step 1: Write the failing graph canvas tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { GraphCanvas } from "./graph-canvas";

describe("GraphCanvas", () => {
  it("renders graph nodes and notifies selection", () => {
    const onSelectNode = vi.fn();
    render(
      <GraphCanvas
        nodes={[{ id: "doc-1", kind: "document", label: "Document One", documentId: "doc-1", searchText: "document one" }]}
        edges={[]}
        matchedNodeIds={["doc-1"]}
        selectedNodeId={null}
        onSelectNode={onSelectNode}
        emptyMessage="No graph matches."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Document One" }));
    expect(onSelectNode).toHaveBeenCalledWith("doc-1");
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
});
```

- [ ] **Step 2: Run the graph canvas tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/features/graph-canvas.test.tsx`
Expected: FAIL because `graph-canvas.tsx` does not exist yet.

- [ ] **Step 3: Add the graph canvas component and shell wiring**

```tsx
// packages/dashboard/src/features/graph-canvas.tsx
import type { Edge } from "@text-comprehend/core";
import type { GraphNodeRecord } from "./graph-view-model";

type GraphCanvasProps = {
  nodes: GraphNodeRecord[];
  edges: Edge[];
  matchedNodeIds: string[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  emptyMessage: string;
};

export function GraphCanvas({ nodes, edges, matchedNodeIds, selectedNodeId, onSelectNode, emptyMessage }: GraphCanvasProps) {
  if (nodes.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <section aria-label="Graph canvas">
      <p>{edges.length} edges visible</p>
      <ul>
        {nodes.map((node) => (
          <li key={node.id}>
            <button type="button" aria-pressed={selectedNodeId === node.id} onClick={() => onSelectNode(node.id)}>
              {matchedNodeIds.includes(node.id) ? `${node.label} (match)` : node.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// replace the placeholder search/facet/graph sections with this wiring inside packages/dashboard/src/features/dashboard-shell.tsx
<SearchControls query={searchQuery} onQueryChange={onSearchQueryChange} onReset={onResetSearch} />
<FacetToggleGroup facets={facets} onFacetChange={onFacetChange} />
<GraphCanvas
  nodes={graph.nodes}
  edges={graph.visibleEdges}
  matchedNodeIds={graph.matchedNodeIds}
  selectedNodeId={selectedNodeId}
  onSelectNode={onSelectNode}
  emptyMessage="No graph matches the current search and facet filters."
/>
```

- [ ] **Step 4: Update shell tests for the new controls**

```tsx
it("wires search reset and graph selection controls when ready", () => {
  const readyData = createReadyDashboardData();
  render(
    <DashboardShell
      data={readyData}
      graph={{ nodes: [{ id: "doc-1", kind: "document", label: "Document One", documentId: "doc-1", searchText: "document one" }], matchedNodeIds: ["doc-1"], visibleEdges: [] }}
      searchQuery="doc"
      facets={{ documents: true, concepts: true, arguments: true, questions: true }}
      selectedDocumentId="doc-1"
      selectedNodeId="doc-1"
      onSearchQueryChange={vi.fn()}
      onResetSearch={vi.fn()}
      onFacetChange={vi.fn()}
      onSelectDocument={vi.fn()}
      onSelectNode={vi.fn()}
    />,
  );

  expect(screen.getByLabelText("Search graph content")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Document One (match)" })).toBeInTheDocument();
});
```

- [ ] **Step 5: Re-run the graph and shell tests**

Run: `npx vitest run packages/dashboard/src/features/graph-canvas.test.tsx packages/dashboard/src/features/dashboard-shell.test.tsx`
Expected: PASS

## Task 4: Expand Detail Panel And App-Level Synchronization

**Files:**
- Modify: `packages/dashboard/src/features/detail-panel-shell.tsx`
- Modify: `packages/dashboard/src/features/detail-panel-shell.test.tsx`
- Modify: `packages/dashboard/src/App.tsx`
- Modify: `packages/dashboard/src/App.test.tsx`

- [ ] **Step 1: Write the failing detail-panel and app tests**

```tsx
it("renders concept detail when a concept node is selected", () => {
  render(
    <DetailPanelShell
      selection={{ kind: "concept", label: "Event Loop", documentTitle: "Document One", definition: "Event Loop definition", importance: "core" }}
      document={null}
      selectedNodeId="concept-1"
    />,
  );

  expect(screen.getByText("Event Loop")).toBeInTheDocument();
  expect(screen.getByText("core")).toBeInTheDocument();
});

it("syncs graph-node selection back to the document list", async () => {
  render(<App source={createFixtureSource()} loadData={async () => createReadyDashboardData()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Event Loop (match)" }));
  expect(screen.getByRole("button", { name: "Document One" })).toHaveAttribute("aria-pressed", "true");
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npx vitest run packages/dashboard/src/features/detail-panel-shell.test.tsx packages/dashboard/src/App.test.tsx`
Expected: FAIL because the current panel and app state only support document-level selection.

- [ ] **Step 3: Expand detail-panel rendering and app state**

```tsx
// add this state and derivation logic inside packages/dashboard/src/App.tsx
const [searchQuery, setSearchQuery] = useState("");
const [facets, setFacets] = useState(createDefaultFacetState());
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

const graph = visibleData.state === "ready"
  ? buildGraphViewModel(visibleData, { searchQuery, facets })
  : null;

useEffect(() => {
  if (visibleData.state !== "ready" || !graph) return;
  if (selectedNodeId && graph.nodes.some((node) => node.id === selectedNodeId)) return;
  setSelectedNodeId(graph.nodes[0]?.id ?? null);
}, [graph, selectedNodeId, visibleData]);

const selectedDocumentId =
  visibleData.state === "ready" ? getSelectedDocumentId(visibleData, selectedNodeId) : null;
```

```tsx
// add this selection rendering branch inside packages/dashboard/src/features/detail-panel-shell.tsx
type DetailSelection =
  | { kind: "document"; label: string; documentTitle: string }
  | { kind: "concept"; label: string; documentTitle: string; definition: string; importance: string }
  | { kind: "argument"; label: string; documentTitle: string; argumentType: string; assumptions: string[]; gaps: string[] }
  | { kind: "question"; label: string; documentTitle: string; answer: string; difficulty: string; facet: string };

{selection?.kind === "concept" ? (
  <>
    <h3>{selection.label}</h3>
    <p>{selection.definition}</p>
    <p>{selection.importance}</p>
    <p>{selection.documentTitle}</p>
  </>
) : null}
```

- [ ] **Step 4: Re-run the detail-panel and app tests**

Run: `npx vitest run packages/dashboard/src/features/detail-panel-shell.test.tsx packages/dashboard/src/App.test.tsx`
Expected: PASS

## Task 5: Run Phase 1 Verification

**Files:**
- No code changes expected in this task.

- [ ] **Step 1: Run focused dashboard tests for the new graph-first foundation**

Run: `npx vitest run packages/dashboard/src/App.test.tsx packages/dashboard/src/features/dashboard-shell.test.tsx packages/dashboard/src/features/detail-panel-shell.test.tsx packages/dashboard/src/features/search-controls.test.tsx packages/dashboard/src/features/facet-toggle-group.test.tsx packages/dashboard/src/features/graph-canvas.test.tsx packages/dashboard/src/features/graph-view-model.test.ts packages/dashboard/src/data/load-dashboard-data.test.ts packages/dashboard/src/main.test.ts`
Expected: PASS

- [ ] **Step 2: Run dashboard package typecheck**

Run: `npm run typecheck --workspace @text-comprehend/dashboard`
Expected: PASS

- [ ] **Step 3: Run dashboard package build**

Run: `npm run build --workspace @text-comprehend/dashboard`
Expected: PASS

- [ ] **Step 4: Confirm Phase 2 work stayed deferred**

Check that the final diff does **not** add:

```text
- semantic zoom thresholds
- pan/zoom state persistence
- graph rendering fallback boundaries beyond a simple empty-results state
- SVG/canvas rendering polish beyond the basic interactive graph surface
- density-based label changes by zoom level
```

- [ ] **Step 5: Leave the branch ready for review**

Run: `git status --short`
Expected: only the intended dashboard files and saved plan/spec docs are modified.
