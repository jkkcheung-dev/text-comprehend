# Priority 6 Graph-First Dashboard Behavior Design

**Date:** 2026-05-25
**Status:** Draft for review

## Scope

This design covers only the last checklist item under Priority 6 in `docs/superpowers/plans/implementation-priority-checklist.md`:

- Add search, facet toggles, detail panel, zoom-level handling, and graph rendering behavior.

It assumes the earlier Priority 6 items are already complete enough to provide:

- a working `packages/dashboard/` app
- a React/Vite dashboard shell with loading, empty, malformed, ready, and refresh-retry behavior
- a working `/comprehend-explore` launch path
- dashboard-local component and interaction tests for the current shell

## Goals

- Turn the current placeholder dashboard shell into a real graph-first exploration UI.
- Make a single global search the primary entry point for finding documents, concepts, arguments, and questions.
- Keep graph selection as the primary selection model across graph, document list, and detail panel.
- Implement hybrid zoom behavior so zoom changes both visual scale and the amount of graph detail shown.
- Reuse the canonical `.text-comprehend/knowledge-graph.json` artifact and existing simplified document outputs without changing the backend data format.

## Non-Goals

- Redesign the core knowledge-graph artifact format.
- Add clustering, saved graph views, background refresh, or collaborative features.
- Introduce a separate graph search and document search for the first pass.
- Implement an explicit explore-vs-inspect mode switch.
- Expand this slice into a full graph-analysis product with advanced layout controls or graph authoring behavior.

## Recommended Approach

Implement the final Priority 6 item as a guided-focus graph shell. A single global search drives a unified working set across documents, concepts, arguments, and questions. Search results, facet toggles, and graph selection all converge on one focused graph view rather than maintaining separate disconnected list and canvas states.

The graph canvas becomes the primary interaction surface. The document list remains available as a secondary navigation aid, but it should follow graph state rather than competing with it. The detail panel should present the selected node first and then the linked document detail when the selection resolves to a document or to content inside one document.

This approach matches the existing dashboard architecture. `App.tsx` already owns dashboard-level state and refresh behavior, while `DashboardShell` and related components are still thin enough to absorb interactive graph behavior without requiring a dashboard-wide rewrite.

## Current Data Constraints

The current dashboard already loads `KnowledgeGraph` and document detail data from canonical artifacts. The relevant shapes are:

- `KnowledgeGraph`
  - `documents: DocumentNode[]`
  - `edges: Edge[]`
- `DocumentNode`
  - document metadata
  - nested `concepts`, `arguments`, and `questions`
- `ConceptNode`, `ArgumentNode`, and `QuestionNode`
  - each carries its own content and source references

The graph UI should therefore be built by deriving a view model from the existing graph artifact, not by requiring new backend output. The implementation may add dashboard-local helper types for flattened graph nodes, normalized labels, and node metadata, but those helpers should be derived in the dashboard package only.

## Architecture

Priority 6 item 6 should be split into four layers:

1. An app-level interaction controller in `packages/dashboard/src/App.tsx`.
   It owns the global search query, active facet toggles, selected graph node id, selected document id, and hybrid zoom state.
2. A graph view-model layer inside the dashboard package.
   It derives renderable nodes, edges, search matches, visible subsets, and zoom-sensitive display rules from the loaded `KnowledgeGraph`.
3. Focused presentation components.
   The shell should delegate to dedicated components for search controls, facet toggles, graph canvas, and detail rendering instead of keeping all behavior inside one file.
4. A synchronized detail and navigation layer.
   The document list and detail panel reflect the active graph focus state and provide secondary navigation back into the graph.

The data loader should remain focused on artifact loading and classification. It should not be expanded into search indexing, graph filtering, or zoom policy logic.

## Interaction Model

### Global Search

- The dashboard should expose one global search input.
- The search should match across:
  - document titles and file paths
  - concept names and definitions
  - argument claims, assumptions, and gaps
  - question text and answers
- The search result set should drive a unified working set rather than separate result lists for different entity types.
- When a search query is present, the dashboard should:
  - highlight matched nodes in the graph
  - reduce the visible graph to matched nodes plus nearby context needed to preserve interpretability
  - narrow supporting panels to the same working set
- If the query has no matches, the graph panel should show a clear empty-results state with an obvious reset path.

### Facet Toggles

- Facet toggles should act as graph visibility controls first, not only list filters.
- The first pass should support toggling at least these node families:
  - documents
  - concepts
  - arguments
  - questions
- Turning off a facet should:
  - remove or suppress those nodes from the graph view model
  - remove those node types from search results
  - suppress their detail content in the detail panel
- If a toggle hides the active selection, the dashboard should clear that selection and return the detail panel to its empty state.

### Graph Selection And Navigation

- Graph-node selection is the primary selection model.
- Clicking a node in the graph should:
  - mark that node as selected
  - visually emphasize it above other matched or contextual nodes
  - update the detail panel
  - update document-list highlighting when the selected node maps to a document
- The document list remains a secondary navigation aid.
- Clicking a document in the list should select and focus the corresponding document node in the graph when available.
- If no explicit selection exists after initial load, the dashboard may seed focus from the first visible document or first search match, but that behavior should be deterministic and minimal.

### Detail Panel

The detail panel should become a true inspection surface instead of only showing layered summary markdown.

When a node is selected, it should show:

- selected node title or label
- selected node type
- node-specific content derived from the graph artifact
  - document: document metadata and simplified content
  - concept: name, definition, importance, and relevant source references
  - argument: claim, type, evidence summary, assumptions, gaps, and source references
  - question: question, answer, difficulty, facet, and source references
- linked document context when the node belongs to a document

When the selected document detail is degraded, the panel should keep the node selection but show the existing degraded detail messaging for the simplified document artifact.

When nothing is selected, the panel should show a clear empty state that explains how to inspect the graph.

### Document List

- The document list should stay visible as contextual navigation, not disappear entirely.
- It should reflect the current working set after search and facet filtering.
- It should indicate which document is selected or currently associated with the selected node.
- It should not become the primary search result surface once the graph is ready.

## Graph Rendering Behavior

The graph rendering layer should move from placeholder text to a real canvas or SVG-based view that renders nodes and edges from the loaded graph data.

The first pass should support:

- rendering document, concept, argument, and question nodes
- rendering edges from the canonical `edges` array
- visually distinguishing node families
- visually distinguishing selected, matched, contextual, and de-emphasized states
- basic pan and zoom interaction

The graph should emphasize focus over completeness. When search or facet controls reduce the working set, the graph may dim non-primary context or remove it, but it should preserve enough neighboring structure for users to understand why a match matters.

If the dashboard reaches a `ready` state but the graph view model cannot produce a valid renderable graph, the graph panel should show a scoped fallback message rather than collapsing the full dashboard into a top-level error state.

## Hybrid Zoom-Level Handling

Zoom should have both visual and semantic effects.

- At all zoom levels, users should be able to pan and scale the graph.
- At lower zoom levels, the graph should reduce label density and hide lower-priority text to preserve readability.
- At medium zoom levels, the graph should show labels for selected, matched, and nearby nodes.
- At higher zoom levels, the graph should reveal richer local detail for the focused neighborhood, such as fuller labels or small metadata text.

The zoom thresholds should be dashboard-local display rules, not backend data changes. The first pass should use a small number of stable thresholds rather than a continuously adaptive semantic layout system.

## State Model

The app-level interaction state should distinguish at least:

- `searchQuery`
- active facet visibility state
- `selectedNodeId`
- `selectedDocumentId`
- graph view state needed for zoom and pan
- derived working set state based on ready data, search, and facets

The implementation may derive most filtered results from current state and loaded data rather than storing duplicated copies. The preferred approach is a small amount of explicit UI state plus dashboard-local pure helpers for search indexing, graph filtering, and detail resolution.

## Error Handling

This item should preserve the existing top-level dashboard states from earlier Priority 6 work:

- `loading`
- `empty`
- `malformed`
- `ready`
- refresh failure with stale-data warning and retry

Within the new interaction layer:

- no search matches
  - show an empty-results message in the graph area and keep reset affordances visible
- hidden selection after facet change
  - clear selection cleanly and show the detail-panel empty state
- degraded simplified document content
  - keep graph selection and render degraded document detail messaging in the panel
- graph render-model failure while data is otherwise ready
  - show a graph-scoped fallback message instead of failing the whole dashboard

The dashboard should not mix stale data from one source with another source's graph state. Existing source-key reset behavior should remain intact.

## Testing Strategy

Testing for this item should focus on behavior and synchronization, not on pixel-perfect layout:

- app-level interaction tests for:
  - global search updating graph, list, and detail state together
  - facet toggles changing graph visibility and clearing hidden selections
  - graph-node selection driving document highlight and detail rendering
  - document-list selection focusing the graph
  - no-match search behavior
- graph view-model tests for:
  - flattening graph entities from `KnowledgeGraph`
  - facet-aware filtering
  - search matching across supported node families
  - hybrid zoom threshold display rules
- focused component tests for:
  - search controls
  - facet toggle controls
  - graph canvas selection behavior
  - detail panel branches for each node family and degraded document detail
- fallback tests for:
  - invalid or empty renderable graph derived from otherwise ready data

These tests should build on the existing dashboard test setup rather than introducing a separate end-to-end browser harness for this slice.

## Likely Repository Touch Points

- `packages/dashboard/src/App.tsx`
  - add graph-first interaction state and derived synchronization rules
- `packages/dashboard/src/features/dashboard-shell.tsx`
  - replace placeholder search, facet, and graph sections with real behavior
- `packages/dashboard/src/features/detail-panel-shell.tsx`
  - expand detail rendering beyond document layered summary only
- new dashboard feature files under `packages/dashboard/src/features/`
  - search control component
  - facet toggle component
  - graph canvas component
  - dashboard-local graph view-model helpers when appropriate
- `packages/dashboard/src/data/types.ts`
  - only if small dashboard-local helper types or refined unions are needed
- existing dashboard test files under `packages/dashboard/src/`
  - extend and add focused interaction coverage

## Scope Boundaries

This item is complete when the dashboard provides:

- a real graph rendering surface for the canonical knowledge graph
- one global search across document and node content
- working facet toggles that affect graph, search, and detail behavior together
- a detail panel driven primarily by graph-node selection
- hybrid zoom behavior with a few stable display thresholds
- synchronized document-list behavior as secondary graph navigation
- focused tests covering the new cross-component interaction model

This item is not responsible for:

- backend graph-schema redesign
- advanced clustering or graph summarization
- saved views or mode switching
- background live updates
- a separate analytics or graph-authoring workflow
