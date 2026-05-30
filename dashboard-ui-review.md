# Dashboard UI Review — Priority 6 Checklist

> Generated 2026-05-30 against commit `HEAD` of the `text-comprehend` repo.

## Summary

All six checklist items under Priority 6 have a functional implementation.  The dashboard package, UI shell, command hook, data-loading resilience, component tests, and interactive controls (search, facets, detail panel, zoom, graph) are all wired end-to-end.  The remaining work is polish, visual design, and richer interaction — things that the checklist calls "available" rather than "beautiful."

### Verification Evidence (2026-05-30)

```
$ npm run test --workspace @text-comprehend/dashboard
 Test Files  11 passed (11)
      Tests  106 passed (106)
  Duration   34.61s

$ npm run typecheck --workspace @text-comprehend/dashboard
> tsc --noEmit
(exit 0 — no errors)
```

All 106 dashboard tests pass and typecheck is clean.

---

## 1. Checklist Tracker

| # | Checklist Item | Status | Evidence |
|---|---------------|--------|----------|
| 1 | Implement `packages/dashboard/` | **IMPLEMENTED** | Full workspace: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `dist/`, 17 source files + 11 test files. |
| 2 | Add the React/Vite dashboard UI | **IMPLEMENTED** | React 19 + Vite 7. Component tree: `App` → `DashboardShell` → `SearchControls`, `FacetToggleGroup`, `GraphCanvas`, `DetailPanelShell`, `SourceStatusBadge`. |
| 3 | Implement `/comprehend-explore` end-to-end | **IMPLEMENTED** | `command-hook.ts` routes the command → `execute-direct-command.ts` → `launch-dashboard.ts` (build, spawn, health-check, cache, reuse). Workspace-identity gating, port retry, browser-open, and error formatting all present. |
| 4 | Dashboard data-loading resilience | **IMPLEMENTED** | Loading/ready/empty/malformed states. Snapshot retention on refresh failure with warning. Auto-retry. Source-key idempotency. Cancelled-async cleanup. Degraded individual-document detail. |
| 5 | Dashboard component & interaction tests | **IMPLEMENTED** | 11 test files (~2,800 LOC of tests): `App.test.tsx` (624 lines), `graph-canvas.test.tsx` (642), `graph-view-model.test.ts` (662), `dashboard-shell.test.tsx` (372), `create-fixture-source.test.ts` (315), `load-dashboard-data.test.ts` (238), `detail-panel-shell.test.tsx` (197), plus smaller tests for facet toggles, search controls, source badge, and main entry. |
| 6 | Search, facet toggles, detail panel, zoom handling, graph rendering | **IMPLEMENTED** (text-based) | `search-controls.tsx` + `graph-view-model.ts` search working set. `facet-toggle-group.tsx` with 4 facets. `detail-panel-shell.tsx` with 4 selection kinds. `graph-canvas.tsx` zoom buttons [0.6, 2.0], zoom-bucket label modes. Graph rendered as accessible list (not force/canvas layout). |

---

## 2. What Works Well

### 2.1 Architecture & Separation
- Clean data layer: `DashboardSource` / `DashboardReader` abstraction means fixture mode and workspace mode are identical to the UI.
- Pure-logic `graph-view-model.ts` (569 lines) with no React dependency — fully unit-testable.
- `App.tsx` orchestrates state; shell components are presentational with minimal logic.

### 2.2 Resilience
- **Snapshot retention**: When a refresh produces malformed data, the last `ready` snapshot stays visible and a warning banner appears.
- **Source-key idempotency**: Changing to the same logical source (e.g. same workspace root) does not trigger a reload.
- **Stale cancellation**: Aborted async loads do not write into state.
- **Degraded documents**: If one simplified artifact is unreadable the entire dashboard still loads; only that document shows a degraded message.

### 2.3 Search & Facet Behavior
- Search trims whitespace, lowercases both query and index text.
- Search working set includes immediate graph neighbours (document parent + edge-connected siblings within the same document).
- Cross-document edge pollution is prevented via `resolveRelationshipEdgeOwners`.
- Facet toggles remove hidden node kinds from both the visible node list and the search working set.
- Node IDs are document-scoped (`docId:kind:rawId`) so identical raw IDs across documents don't collide.

### 2.4 Accessibility
- Graph nodes are `<button>` elements with `aria-label` and `aria-current` for selection.
- Detail panel announces selected and degraded document states.
- Malformed-data section uses `role="alert"`.
- Refresh warning uses `role="status"`.

### 2.5 Test Coverage
- Graph-view-model is tested for: flattening, search working set, context preservation, cross-document ID isolation, edge scoping, zoom buckets, label modes, and renderable-graph validation.
- Graph-canvas is tested for: basic rendering, edge rendering, duplicate-label disambiguation (with rawId + kind fallback), zoom controls, zoom label mode switching, disabled state, and colons-in-IDs.
- App tests cover: loading→ready transition, selection sync, facet-clears-selection, source-key change, snapshot retention, malformed-synchronous-throw, and refresh cycles.

---

## 3. Gaps & Missing Features

Each gap is tagged with a severity estimate: **high** = breaks a documented checklist expectation, **medium** = degrades user experience meaningfully, **low** = nice-to-have.

### 3.1 No Visual Styles (high)
- **No CSS file exists anywhere** in `packages/dashboard/`. Every component renders bare HTML.
- The dashboard shell uses semantic HTML (`<main>`, `<header>`, `<aside>`, `<section>`) but without layout styles there is no sidebar/main-panel split, no responsive stacking, no hover/focus/active states.
- *Impact*: The dashboard is functional but looks like an unstyled document.  Users cannot distinguish sections visually.

### 3.2 Graph Rendering Is Text-Only (medium)
- `graph-canvas.tsx` renders nodes and edges as flat `<ul>`/`<li>` lists with `source → target (type)` text entries.
- There is **no force-directed layout, no D3/cytoscape/vis.js canvas, no spatial positioning**.  Edges are not drawn as lines/arrows.
- The zoom CSS transform (`scale` + `translate`) applies to the text list container but does not change the spatial layout of nodes.
- The component is named `GraphCanvas` and the section is `aria-label="Graph canvas"` — so the label implies a canvas-style renderer that does not yet exist.
- *Impact*: For graphs with more than ~20 nodes, the flat list is hard to scan.  Edge directionality is textual only.

### 3.3 No Pan/Drag Interaction (medium)
- The `GraphCanvasViewState` includes `offsetX`/`offsetY`, and the CSS transform uses them, but **no pan handler** exists (no mouse drag, no middle-mouse pan, no touch drag).
- Zoom is only available via +/- buttons.  No mouse-wheel zoom or pinch-to-zoom.
- *Impact*: Users cannot explore large graphs spatially.

### 3.4 Missing Detail Artifact Display (medium)
- The data loader fetches all four simplified artifacts: `layered-summary.md`, `concept-glossary.md`, `argument-map.md`, `comprehension-check.md`.
- The detail panel renders **only `layeredSummary`** in a `<pre>` tag for the document selection kind.
- The other three loaded artifacts (`conceptGlossary`, `argumentMap`, `comprehensionCheck`) are **never surfaced** in any UI component.
- *Impact*: Valuable extracted content that the pipeline already produces is invisible to the user.

### 3.5 No Comprehension Check / Interactive Question UI (medium)
- Questions are loaded as graph nodes and shown in the graph list, but there is **no interactive comprehension-check view** where a user could answer questions and verify against the pipeline-generated answers.
- The `ComprehensionCheck` facet type exists in the core schemas with `answer`, `difficulty`, and `facet` fields — all loaded — but never used for Q&A interaction.

### 3.6 No Document List Search/Filter (low)
- The sidebar document list is filtered to match graph working set (so it respects search + facets), but there is **no independent document-list search**.
- Users cannot filter documents by title or path without also affecting the graph view.

### 3.7 No Keyboard Shortcuts (low)
- No keyboard navigation beyond default tab order.
- No shortcuts for: toggle facets, clear search, next/previous node, zoom in/out, close detail panel, refresh.

### 3.8 No Loading Skeleton/Progress (low)
- The loading state renders only a `<p>Loading dashboard data...</p>` string.
- No skeleton placeholders, no progress bars, no spinner.

### 3.9 No Dark Mode / Theming (low)
- No CSS custom properties, no theme toggle, no `prefers-color-scheme` detection.

### 3.10 No Graph Export (low)
- No export-to-SVG/PNG, no copy-as-JSON, no share-link generation.

### 3.11 No Node Collapse/Expand (low)
- Graph nodes are always visible (subject to facet filters).  There is no collapse/expand to hide child nodes of a document.

### 3.12 No Virtualized Rendering for Large Graphs (low)
- All nodes and edges render into the DOM at once.  For workspaces with many documents, this could cause performance issues.

### 3.13 Search Is Substring-Only (low)
- No regex, no fuzzy matching, no match highlighting in the detail panel.

---

## 4. Component-by-Component Assessment

### `main.tsx` & `resolve-dashboard-source.ts`
- **Status**: Complete. Correctly resolves fixture vs workspace mode from query params.

### `App.tsx` (340 lines)
- **Status**: Complete. Robust state machine with snapshot retention, source-key idempotency, auto-initialize selection.
- **Gap**: No error boundary for rendering exceptions.  If `DetailSelection` construction throws due to malformed graph data the entire app could unmount.

### `data/types.ts` (72 lines)
- **Status**: Complete. All data shapes covered.
- **Gap**: `ReadyDashboardData` type does not validate that graph edges reference existing document IDs.

### `data/load-dashboard-data.ts` (129 lines)
- **Status**: Complete. Knows the artifact paths, parses knowledge-graph via Zod schema, sequential loads simplified documents.
- **Gap**: Loads all simplified artifacts in parallel per document, which is correct, but loads documents *sequentially* — could be parallelized for large workspaces.

### `data/create-fixture-source.ts` & `create-workspace-source.ts`
- **Status**: Complete. Fetch wrappers with proper error semantics.

### `features/dashboard-shell.tsx` (253 lines)
- **Status**: Complete. Composes all child components, computes visible documents from graph working set, handles all data states.
- **Gap**: No CSS for layout. No responsive breakpoints.

### `features/graph-view-model.ts` (569 lines)
- **Status**: Complete. Well-tested pure-logic module.  Handles all edge routing, cross-document scoping, search working set.
- **Gap**: Search is case-insensitive substring only (this is a design choice, not a bug).

### `features/graph-canvas.tsx` (162 lines)
- **Status**: Functional but minimal. Text-list rendering of nodes + edges.  Zoom buttons work.  Duplicate label disambiguation works.
- **Gaps**: No spatial layout, no edge lines, no drag-to-pan, no wheel-zoom.

### `features/detail-panel-shell.tsx` (125 lines)
- **Status**: Complete for document/concept/argument/question selection kinds.  Shows source references.
- **Gap**: Does not render `conceptGlossary`, `argumentMap`, or `comprehensionCheck` artifacts.

### `features/facet-toggle-group.tsx` (35 lines)
- **Status**: Complete. All four facets, disabled state, checked state.

### `features/search-controls.tsx` (25 lines)
- **Status**: Complete. Search input + clear button, disabled state.

### `features/source-status-badge.tsx` (9 lines)
- **Status**: Complete. Trivial fixture/workspace badge.

### Vite config (`vite.config.ts`)
- **Status**: Complete. Fixture middleware, workspace middleware (with realpath-based escape prevention), health endpoint, configured-workspace-root enforcement.  Works for both dev and preview.

---

## 5. Recommended Next Steps

If work on Priority 6 resumes, a suggested order:

1. **Add CSS** — Even basic layout styles (flex/grid, sidebar + main panel, colours) would transform the dashboard from proof-of-concept to usable.
2. **Visual graph rendering** — Integrate a lightweight graph library (e.g. `d3-force` or `@xyflow/react`) to replace the text-list rendering.  This is the single biggest UX improvement possible.
3. **Display all simplified artifacts** — Wire up `conceptGlossary`, `argumentMap`, and `comprehensionCheck` into the detail panel (tabs or accordion sections).
4. **Pan + scroll-wheel zoom** — Add mouse drag and wheel handlers to `GraphCanvas`.
5. **Interactive comprehension check** — Build a Q&A view that lets users answer questions and reveal the pipeline-generated answers.

Items 2–4 would collectively make the checklist items feel "done" rather than "functional."
