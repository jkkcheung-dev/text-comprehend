# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the dashboard from CSS Modules to TailwindCSS v4 Dark theme with xyflow knowledge graph, Zustand state, and impeccable-compliant design.

**Architecture:** Replace all React UI components with Tailwind v4. Preserve TypeScript data layer (types, load-dashboard-data, graph-view-model, markdown-renderer). Zustand store replaces useState sprawl in App.tsx. Delete 14 CSS module files. Add Tailwind v4 + @tailwindcss/vite plugin.

**Tech Stack:** React 19, Vite 7, TailwindCSS v4, Zustand, @xyflow/react v12, @dagrejs/dagre, Fira Sans + Fira Code, Lucide icons

---

## File Structure

```
packages/dashboard/src/
├── index.css                   ← NEW: @import "tailwindcss" + @theme block
├── main.tsx                    ← MODIFY: replace CSS module imports
├── vite.config.ts              ← MODIFY: add @tailwindcss/vite plugin
├── App.tsx                     ← REWRITE: thin orchestrator, store init
├── store/
│   └── dashboard-store.ts      ← NEW: Zustand store
├── data/
│   ├── types.ts                ← NO CHANGES (preserve)
│   ├── load-dashboard-data.ts  ← NO CHANGES (preserve)
│   ├── create-fixture-source.ts ← NO CHANGES (preserve)
│   └── create-workspace-source.ts ← NO CHANGES (preserve)
├── features/
│   ├── graph-view-model.ts     ← NO CHANGES (preserve)
│   ├── graph-view-model.test.ts ← NO CHANGES (preserve)
│   ├── markdown-renderer.ts    ← NO CHANGES (preserve)
│   ├── markdown-renderer.test.ts ← NO CHANGES (preserve)
│   ├── dashboard-shell.tsx     ← REWRITE: Tailwind layout
│   ├── graph-canvas.tsx        ← REWRITE: xyflow + dagre
│   ├── graph-canvas.module.css ← DELETE
│   ├── graph-nodes/
│   │   ├── DocumentNode.tsx    ← REWRITE: impeccable design
│   │   ├── ConceptNode.tsx     ← REWRITE
│   │   ├── ArgumentNode.tsx    ← REWRITE
│   │   └── QuestionNode.tsx    ← REWRITE
│   ├── detail-panel-shell.tsx  ← REWRITE: tabbed
│   ├── detail-panel-shell.module.css ← DELETE
│   ├── comprehension-check.tsx ← REWRITE
│   ├── comprehension-check.module.css ← DELETE
│   ├── search-controls.tsx     ← REWRITE
│   ├── search-controls.module.css ← DELETE
│   ├── facet-toggle-group.tsx  ← REWRITE
│   ├── facet-toggle-group.module.css ← DELETE
│   ├── source-status-badge.tsx ← REWRITE
│   ├── source-status-badge.module.css ← DELETE
│   ├── dashboard-shell.module.css ← DELETE
│   ├── dashboard-shell.test.tsx ← REWRITE: update selectors
│   ├── graph-canvas.test.tsx   ← REWRITE: xyflow tests
│   ├── search-controls.test.tsx ← REWRITE
│   ├── facet-toggle-group.test.tsx ← REWRITE
│   ├── source-status-badge.test.tsx ← REWRITE
│   ├── detail-panel-shell.test.tsx ← REWRITE
│   └── comprehension-check.test.tsx ← REWRITE
├── App.module.css              ← DELETE
├── App.test.tsx                ← REWRITE: Tailwind selectors
├── main.test.ts                ← NO CHANGES
├── test/
│   └── factories.ts            ← MODIFY: keep createAvailableDetailFull
└── styles/
    ├── tokens.css              ← DELETE
    └── reset.css               ← DELETE

tests/fixtures/dashboard-workspace/.text-comprehend/ ← PRESERVE (fixture data)
```

---

### Phase 1: Foundation — Tailwind v4 + Clean Slate

#### Task 1.1: Install new dependencies

**Files:**
- Modify: `packages/dashboard/package.json`

- [ ] **Step 1: Install zustand, tailwindcss, and @tailwindcss/vite**

```bash
npm install --workspace @text-comprehend/dashboard zustand tailwindcss@^4 @tailwindcss/vite
```

Expected: Three new entries in `packages/dashboard/package.json` under dependencies.

- [ ] **Step 2: Verify install**

```bash
npm ls zustand tailwindcss @tailwindcss/vite --workspace @text-comprehend/dashboard
```

Expected: All three listed as direct dependencies.

- [ ] **Step 3: Commit**

```bash
git add packages/dashboard/package.json packages/dashboard/package-lock.json
git commit -m "feat(dashboard): add zustand, tailwindcss v4, and @tailwindcss/vite"
```

---

#### Task 1.2: Create Tailwind entry CSS with dark theme tokens

**Files:**
- Create: `packages/dashboard/src/index.css`

- [ ] **Step 1: Create index.css**

File: `packages/dashboard/src/index.css`

```css
@import "tailwindcss";

@theme {
  --color-surface-canvas: #09090B;
  --color-surface-panel: #18181B;
  --color-surface-raised: #27272A;
  --color-border-default: #3F3F46;

  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  --color-text-muted: #71717A;

  --color-accent-primary: #3B82F6;
  --color-accent-success: #22C55E;
  --color-accent-warning: #F59E0B;
  --color-accent-danger: #EF4444;

  --color-facet-document: #A1A1AA;
  --color-facet-concept: #6366F1;
  --color-facet-argument: #F59E0B;
  --color-facet-question: #10B981;

  --font-sans: "Fira Sans", system-ui, sans-serif;
  --font-mono: "Fira Code", ui-monospace, monospace;
}

html {
  font-family: var(--font-sans);
  background-color: var(--color-surface-canvas);
  color: var(--color-text-primary);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/index.css
git commit -m "feat(dashboard): add Tailwind v4 entry CSS with dark theme tokens"
```

---

#### Task 1.3: Wire Tailwind v4 into Vite

**Files:**
- Modify: `packages/dashboard/vite.config.ts`

- [ ] **Step 1: Read current vite.config.ts, then add @tailwindcss/vite plugin**

Add `import tailwindcss from "@tailwindcss/vite";` at the top. Add `tailwindcss()` to the plugins array, before or after the existing middleware plugin.

```typescript
import tailwindcss from "@tailwindcss/vite";

// In the plugins array:
plugins: [
  tailwindcss(),
  // ... existing middleware plugin stays
],
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck --workspace @text-comprehend/dashboard 2>&1
```

Expected: Exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/dashboard/vite.config.ts
git commit -m "feat(dashboard): add @tailwindcss/vite plugin"
```

---

#### Task 1.4: Update main.tsx entry point

**Files:**
- Modify: `packages/dashboard/src/main.tsx`

- [ ] **Step 1: Read current main.tsx, then replace CSS import**

Replace any `import "./styles/reset.css"` and `import "./App.module.css"` with a single `import "./index.css"`.

```typescript
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
```

Remove any other CSS module imports. Keep all React/App imports.

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/main.tsx
git commit -m "feat(dashboard): switch main.tsx to Tailwind entry CSS"
```

---

#### Task 1.5: Delete all CSS module files and styles directory

**Files:**
- Delete: All `*.module.css` under `packages/dashboard/src/`
- Delete: `packages/dashboard/src/styles/` directory entirely

- [ ] **Step 1: Delete CSS modules and styles**

```bash
find packages/dashboard/src -name "*.module.css" -delete
rm -rf packages/dashboard/src/styles/
```

- [ ] **Step 2: Commit**

```bash
git add -A packages/dashboard/src/
git commit -m "chore(dashboard): remove all CSS modules and styles directory"
```

---

#### Task 1.6: Write minimal App.tsx shell to verify Tailwind works

**Files:**
- Rewrite: `packages/dashboard/src/App.tsx`

- [ ] **Step 1: Replace App.tsx with minimal shell**

```typescript
import { useEffect, useState } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardData, DashboardSource } from "./data/types";

type AppProps = {
  source: DashboardSource;
  loadData?: (source: DashboardSource) => Promise<DashboardData>;
};

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadData(source).then(() => setLoaded(true));
  }, []);

  return (
    <div className="h-screen bg-surface-canvas text-text-primary flex items-center justify-center font-mono text-sm">
      Text Comprehend {loaded ? "— ready" : "— loading..."}
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev --workspace @text-comprehend/dashboard
```

Open http://localhost:5173 — should show dark background with "Text Comprehend — ready" text in Fira Code.

- [ ] **Phase 1 Gate: Playwright screenshot + user review**

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
```

Expected: Dark page (`#09090B`) with Fira Code text centered.

- [ ] **Commit**

```bash
git add packages/dashboard/src/App.tsx
git commit -m "feat(dashboard): minimal App.tsx shell verifying Tailwind v4"
```

**Wait for user approval before proceeding.**

---

### Phase 2: Zustand Store + Data Wiring

#### Task 2.1: Create Zustand store

**Files:**
- Create: `packages/dashboard/src/store/dashboard-store.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from "zustand";
import type { DashboardData, DashboardSource } from "../data/types";
import type { GraphFacetState } from "../features/graph-view-model";
import { createDefaultFacetState } from "../features/graph-view-model";

type ReadyDashboardData = Extract<DashboardData, { state: "ready" }>;

type GraphViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type DashboardStore = {
  source: DashboardSource | null;
  data: DashboardData | null;
  lastReadyData: ReadyDashboardData | null;
  refreshToken: number;
  refreshWarning: string | null;

  searchQuery: string;
  facets: GraphFacetState;
  selectedNodeId: string | null;
  graphViewState: GraphViewState;

  initialize: (source: DashboardSource) => void;
  setData: (data: DashboardData) => void;
  setSearchQuery: (query: string) => void;
  toggleFacet: (facet: keyof GraphFacetState) => void;
  selectNode: (id: string | null) => void;
  refresh: () => void;
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  source: null,
  data: null,
  lastReadyData: null,
  refreshToken: 0,
  refreshWarning: null,

  searchQuery: "",
  facets: createDefaultFacetState(),
  selectedNodeId: null,
  graphViewState: { zoom: 1, offsetX: 0, offsetY: 0 },

  initialize: (source) => set({ source, data: null, lastReadyData: null, searchQuery: "", facets: createDefaultFacetState(), selectedNodeId: null }),

  setData: (data) => set((state) => {
    if (data.state === "ready") {
      return { data, lastReadyData: data, refreshWarning: null };
    }
    if (data.state === "malformed" && state.lastReadyData) {
      return { refreshWarning: "Dashboard refresh failed. Showing the last loaded data." };
    }
    return { data, lastReadyData: null };
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleFacet: (facet) => set((state) => ({
    facets: { ...state.facets, [facet]: !state.facets[facet] },
  })),

  selectNode: (id) => set({ selectedNodeId: id }),

  refresh: () => set((state) => ({ refreshToken: state.refreshToken + 1, refreshWarning: null })),
}));
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck --workspace @text-comprehend/dashboard 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add packages/dashboard/src/store/
git commit -m "feat(dashboard): add Zustand store for dashboard state"
```

---

#### Task 2.2: Rewrite App.tsx with store wiring

**Files:**
- Rewrite: `packages/dashboard/src/App.tsx`

- [ ] **Step 1: Replace App.tsx with store-based orchestrator**

```typescript
import { useEffect } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardSource } from "./data/types";
import { useDashboardStore } from "./store/dashboard-store";

type AppProps = {
  source: DashboardSource;
  loadData?: typeof loadDashboardData;
};

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const initialize = useDashboardStore((s) => s.initialize);
  const setData = useDashboardStore((s) => s.setData);
  const data = useDashboardStore((s) => s.data);
  const refreshToken = useDashboardStore((s) => s.refreshToken);

  useEffect(() => {
    initialize(source);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadData(source).then((nextData) => {
      if (cancelled) return;
      setData(nextData);
    });
    return () => { cancelled = true; };
  }, [source, loadData, setData, refreshToken]);

  const docCount = data?.state === "ready" ? data.documents.length : 0;
  const nodeCount = data?.state === "ready" ? data.graph.nodes.filter((n) => n.kind !== "document").length : 0;

  return (
    <div className="h-screen bg-surface-canvas text-text-primary flex flex-col items-center justify-center font-mono">
      <div className="text-lg mb-2">Text Comprehend</div>
      {data?.state === "loading" && <div className="text-text-muted text-sm">Loading...</div>}
      {data?.state === "empty" && <div className="text-text-muted text-sm">No documents found</div>}
      {data?.state === "malformed" && <div className="text-accent-danger text-sm">Data load failed</div>}
      {data?.state === "ready" && (
        <div className="text-text-secondary text-sm">
          {docCount} document{docCount !== 1 ? "s" : ""} &middot; {nodeCount} node{nodeCount !== 1 ? "s" : ""} loaded
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify data loads from fixture**

```bash
npm run dev --workspace @text-comprehend/dashboard
```

Open http://localhost:5173 — should show "Text Comprehend" then "1 document · X nodes loaded".

- [ ] **Phase 2 Gate: Playwright screenshot + user review**

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
```

Expected: Shows real document and node count from fixture.

- [ ] **Commit**

```bash
git add packages/dashboard/src/App.tsx
git commit -m "feat(dashboard): wire App.tsx with Zustand store and data loading"
```

**Wait for user approval before proceeding.**

---

### Phase 3: Shell Layout — Header + Sidebar + Structure

#### Task 3.1: Rewrite DashboardShell with dark layout

**Files:**
- Rewrite: `packages/dashboard/src/features/dashboard-shell.tsx`

- [ ] **Step 1: Write new DashboardShell.tsx**

```typescript
import { ReactFlowProvider } from "@xyflow/react";
import type { DashboardData, DashboardDocument } from "../data/types";
import { useDashboardStore } from "../store/dashboard-store";
import { SearchControls } from "./search-controls";
import { FacetToggleGroup } from "./facet-toggle-group";
import { SourceStatusBadge } from "./source-status-badge";
import { GraphCanvas } from "./graph-canvas";
import { DetailPanelShell } from "./detail-panel-shell";
import { buildGraphViewModel, createDefaultFacetState, validateRenderableGraph, type GraphFacetState } from "./graph-view-model";

function getDocumentButtonLabels(documents: DashboardDocument[]): Map<string, string> {
  const titleCount = new Map<string, number>();
  for (const doc of documents) {
    titleCount.set(doc.title, (titleCount.get(doc.title) ?? 0) + 1);
  }
  return new Map(
    documents.map((doc) => [
      doc.id,
      (titleCount.get(doc.title) ?? 0) > 1 ? `${doc.title} (${doc.filePath})` : doc.title,
    ]),
  );
}

export function DashboardShell() {
  const data = useDashboardStore((s) => s.data);
  const searchQuery = useDashboardStore((s) => s.searchQuery);
  const facets = useDashboardStore((s) => s.facets);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const setSearchQuery = useDashboardStore((s) => s.setSearchQuery);
  const toggleFacet = useDashboardStore((s) => s.toggleFacet);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const refresh = useDashboardStore((s) => s.refresh);

  if (!data) return null;

  const isReady = data.state === "ready";
  const graph = isReady
    ? buildGraphViewModel(data, { searchQuery, facets })
    : null;

  const selectedDocument = isReady && selectedNodeId
    ? data.documents.find((d) => d.id === data.graph.nodes.find((n) => n.id === selectedNodeId)?.documentId) ?? null
    : isReady ? data.documents[0] ?? null : null;

  const documents = isReady ? data.documents : [];

  return (
    <div className="h-screen flex flex-col bg-surface-canvas">
      {/* Header */}
      <header className="h-12 flex items-center px-4 gap-4 bg-surface-canvas border-b border-border-default shrink-0">
        <span className="font-mono font-bold text-sm text-text-primary whitespace-nowrap">
          Text Comprehend
        </span>
        <SearchControls
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onReset={() => setSearchQuery("")}
        />
        <div className="flex-1" />
        <SourceStatusBadge source={data.source} />
        {data.source.mode === "workspace" && (
          <span className="text-xs text-text-secondary opacity-70 font-mono">{data.source.workspaceRoot}</span>
        )}
        {isReady && (
          <button type="button" onClick={refresh} className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded transition-colors">
            Refresh
          </button>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 bg-surface-panel border-r border-border-default flex flex-col">
          <div className="p-4 border-b border-border-default">
            <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Documents</h2>
            {isReady ? (
              <div className="flex flex-col gap-0.5">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => selectNode(`${encodeURIComponent(doc.id)}:document:${encodeURIComponent(doc.id)}`)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-sm text-text-secondary hover:bg-surface-raised transition-colors truncate ${selectedDocument?.id === doc.id ? "bg-surface-raised text-text-primary font-medium" : ""}`}
                  >
                    {doc.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">
                Document list unavailable until dashboard data is ready.
              </p>
            )}
          </div>
          <div className="p-4 border-b border-border-default">
            <FacetToggleGroup facets={facets} onFacetChange={toggleFacet} />
          </div>
          <div className="mt-auto p-3 border-t border-border-default text-[10px] text-text-muted">
            <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Source</h2>
            <span className="font-mono">{data.source.mode === "fixture" ? data.source.fixtureName : data.source.workspaceRoot}</span>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative border-b border-border-default min-h-0">
            {data.state === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Loading dashboard data...</div>
            )}
            {data.state === "empty" && (
              <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Run /comprehend in your workspace to generate dashboard artifacts.</div>
            )}
            {data.state === "malformed" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-accent-danger text-sm gap-1" role="alert">
                <span>Dashboard data could not be loaded</span>
              </div>
            )}
            {isReady && (
              <ReactFlowProvider>
                <GraphCanvas
                  nodes={graph?.nodes ?? []}
                  edges={graph?.visibleEdges ?? []}
                  matchedNodeIds={graph?.matchedNodeIds ?? []}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={selectNode}
                  emptyMessage="No graph matches the current search and facet filters."
                />
              </ReactFlowProvider>
            )}
          </div>
          <div className="h-[180px] shrink-0 bg-surface-panel">
            <DetailPanelShell
              document={selectedDocument}
              selectedNodeId={selectedNodeId}
              selection={
                selectedNodeId && isReady
                  ? (() => {
                      const node = graph?.nodes.find((n) => n.id === selectedNodeId);
                      if (!node) return null;
                      return { kind: node.kind, label: node.label, documentTitle: selectedDocument?.title ?? "" };
                    })()
                  : null
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server, verify shell renders**

```bash
npm run dev --workspace @text-comprehend/dashboard
```

- [ ] **Phase 3 Gate: Playwright screenshot + user review**

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
```

Expected: Header with "Text Comprehend", search input, source badge. Sidebar with "Documents" heading and facet toggles. Empty graph area. Empty detail panel. All dark theme.

- [ ] **Commit**

```bash
git add packages/dashboard/src/features/dashboard-shell.tsx
git commit -m "feat(dashboard): rewrite DashboardShell with Tailwind dark layout"
```

**Wait for user approval before proceeding.**

---

### Phase 3 (continued): Sidebar Child Components

#### Task 3.2: Rewrite SearchControls

**Files:**
- Rewrite: `packages/dashboard/src/features/search-controls.tsx`

- [ ] **Step 1: Write new SearchControls.tsx**

```typescript
type SearchControlsProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onReset: () => void;
};

export function SearchControls({ query, onQueryChange, onReset }: SearchControlsProps) {
  return (
    <div className="flex items-center gap-2 max-w-[280px] w-full">
      <div className="relative flex-1">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search graph..."
          aria-label="Search graph"
          className="w-full bg-surface-raised border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-primary transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono border border-border-default rounded px-1 hidden sm:block">
          ⌘K
        </kbd>
      </div>
      {query && (
        <button type="button" onClick={onReset} className="text-[10px] text-text-muted hover:text-text-primary px-2 py-1 border border-border-default rounded transition-colors">
          Clear
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/features/search-controls.tsx
git commit -m "feat(dashboard): rewrite SearchControls with Tailwind dark input"
```

---

#### Task 3.3: Rewrite FacetToggleGroup

**Files:**
- Rewrite: `packages/dashboard/src/features/facet-toggle-group.tsx`

- [ ] **Step 1: Write new FacetToggleGroup.tsx**

```typescript
import type { GraphFacetState } from "./graph-view-model";

const facetKeys = ["concepts", "arguments", "questions"] as const;

const facetConfig: Record<(typeof facetKeys)[number], { label: string; color: string }> = {
  concepts: { label: "Concepts", color: "var(--color-facet-concept)" },
  arguments: { label: "Arguments", color: "var(--color-facet-argument)" },
  questions: { label: "Questions", color: "var(--color-facet-question)" },
};

type FacetToggleGroupProps = {
  facets: GraphFacetState;
  onFacetChange: (facet: keyof GraphFacetState, value: boolean) => void;
};

export function FacetToggleGroup({ facets, onFacetChange }: FacetToggleGroupProps) {
  return (
    <fieldset className="border-none flex flex-col gap-1.5">
      <legend className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
        Visible Node Types
      </legend>
      {facetKeys.map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: facetConfig[key].color }} />
          <input
            type="checkbox"
            checked={facets[key]}
            onChange={(e) => onFacetChange(key, e.target.checked)}
            className="accent-accent-primary w-3.5 h-3.5"
          />
          {facetConfig[key].label}
        </label>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/features/facet-toggle-group.tsx
git commit -m "feat(dashboard): rewrite FacetToggleGroup with Tailwind dark checkboxes"
```

---

#### Task 3.4: Rewrite SourceStatusBadge

**Files:**
- Rewrite: `packages/dashboard/src/features/source-status-badge.tsx`

- [ ] **Step 1: Write new SourceStatusBadge.tsx**

```typescript
type SourceStatusBadgeProps = {
  source: { mode: string; fixtureName?: string; workspaceRoot?: string; label: string };
};

export function SourceStatusBadge({ source }: SourceStatusBadgeProps) {
  const isFixture = source.mode === "fixture";
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap border ${isFixture ? "bg-facet-document/15 text-facet-document border-facet-document/30" : "bg-accent-success/10 text-accent-success border-accent-success/30"}`}>
      {isFixture ? "Fixture" : "Workspace"}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/features/source-status-badge.tsx
git commit -m "feat(dashboard): rewrite SourceStatusBadge with Tailwind chip"
```

- [ ] **Phase 3 complete gate**

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
npm run dev --workspace @text-comprehend/dashboard
```

Expected: Full dark shell with header, sidebar (doc list + facet toggles), search input, source badge. Placeholder graph area. Empty detail panel.

**Wait for user approval before proceeding.**

---

### Phase 4: Graph Canvas — xyflow + Custom Nodes

#### Task 4.1: Rewrite DocumentNode

**Files:**
- Rewrite: `packages/dashboard/src/features/graph-nodes/DocumentNode.tsx`

- [ ] **Step 1: Write impeccable-compliant DocumentNode**

```typescript
import { Handle, Position, type Node } from "@xyflow/react";

type DocumentNodeData = { label: string; kind: string; documentId: string };

export function DocumentNode({ data, selected }: { data: DocumentNodeData; selected: boolean }) {
  return (
    <div className={`bg-surface-canvas border rounded-md py-2.5 px-4 max-w-[220px] ${selected ? "border-accent-primary shadow-[0_0_12px_rgba(59,130,246,0.2)]" : "border-border-default"} shadow-[0_2px_8px_rgba(0,0,0,0.5)]`}
      style={{ borderTopColor: selected ? "var(--color-accent-primary)" : "var(--color-facet-document)", borderTopWidth: 2, borderTopStyle: "solid" }}>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div className="font-mono text-[13px] font-semibold text-text-primary truncate">{data.label}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: "var(--color-facet-document)" }} />
        <span className="text-[11px] text-text-muted font-sans">document</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/features/graph-nodes/DocumentNode.tsx
git commit -m "feat(dashboard): rewrite DocumentNode with impeccable tailwind design"
```

---

#### Task 4.2: Rewrite ConceptNode, ArgumentNode, QuestionNode

**Files:**
- Rewrite: `packages/dashboard/src/features/graph-nodes/ConceptNode.tsx`
- Rewrite: `packages/dashboard/src/features/graph-nodes/ArgumentNode.tsx`
- Rewrite: `packages/dashboard/src/features/graph-nodes/QuestionNode.tsx`

- [ ] **Step 1: Write ConceptNode.tsx**

```typescript
import { Handle, Position } from "@xyflow/react";

type FacetNodeData = { label: string; kind: string; documentId: string };

export function ConceptNode({ data, selected }: { data: FacetNodeData; selected: boolean }) {
  return (
    <div className={`bg-surface-canvas border rounded-md py-2.5 px-4 max-w-[200px] ${selected ? "border-accent-primary shadow-[0_0_12px_rgba(59,130,246,0.2)]" : "border-border-default"} shadow-[0_2px_8px_rgba(0,0,0,0.5)]`}
      style={{ borderTopColor: selected ? "var(--color-accent-primary)" : "var(--color-facet-concept)", borderTopWidth: 2, borderTopStyle: "solid" }}>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div className="font-mono text-[13px] font-semibold text-text-primary truncate">{data.label}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: "var(--color-facet-concept)" }} />
        <span className="text-[11px] text-text-muted font-sans">concept</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write ArgumentNode.tsx**

Same as ConceptNode but facet color `var(--color-facet-argument)` and label `"argument"`.

- [ ] **Step 3: Write QuestionNode.tsx**

Same as ConceptNode but facet color `var(--color-facet-question)` and label `"question"`.

- [ ] **Step 4: Commit all three**

```bash
git add packages/dashboard/src/features/graph-nodes/
git commit -m "feat(dashboard): rewrite ConceptNode, ArgumentNode, QuestionNode with impeccable design"
```

---

#### Task 4.3: Rewrite GraphCanvas with xyflow + dagre

**Files:**
- Rewrite: `packages/dashboard/src/features/graph-canvas.tsx`

- [ ] **Step 1: Write new GraphCanvas.tsx**

```typescript
import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { DocumentNode } from "./graph-nodes/DocumentNode";
import { ConceptNode } from "./graph-nodes/ConceptNode";
import { ArgumentNode } from "./graph-nodes/ArgumentNode";
import { QuestionNode } from "./graph-nodes/QuestionNode";
import type { GraphEdgeRecord, GraphNodeRecord } from "./graph-view-model";
import { validateRenderableGraph } from "./graph-view-model";

const nodeTypes = {
  documentNode: DocumentNode,
  conceptNode: ConceptNode,
  argumentNode: ArgumentNode,
  questionNode: QuestionNode,
};

const EDGE_COLORS: Record<string, string> = {
  contains: "#3F3F46",
  defines: "#6366F1",
  depends_on: "#6366F1",
  exemplifies: "#6366F1",
  supports: "#6366F1",
  contradicts: "#EF4444",
  questions: "#10B981",
};

const EDGE_DASH: Record<string, string> = {
  contains: "",
  defines: "",
  depends_on: "5,5",
  exemplifies: "2,4",
  supports: "",
  contradicts: "5,5",
  questions: "5,5",
};

const ANIMATED_EDGES = new Set(["defines", "depends_on", "contradicts"]);

function toXYFlowNodes(records: GraphNodeRecord[], selectedNodeId: string | null): Node[] {
  return records.map((r) => ({
    id: r.id,
    type: `${r.kind}Node` as keyof typeof nodeTypes,
    position: { x: 0, y: 0 },
    data: { label: r.label, kind: r.kind, documentId: r.documentId },
    selected: r.id === selectedNodeId,
  }));
}

function toXYFlowEdges(records: GraphEdgeRecord[]): Edge[] {
  return records.map((e) => ({
    id: `${e.source}:${e.target}:${e.type}`,
    source: e.source,
    target: e.target,
    type: "smoothstep" as const,
    animated: ANIMATED_EDGES.has(e.type),
    style: {
      stroke: EDGE_COLORS[e.type] ?? "#3F3F46",
      strokeDasharray: EDGE_DASH[e.type] ?? "",
    },
    label: e.type,
  }));
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 140, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) {
    g.setNode(node.id, { width: 200, height: 64 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return { ...node, position: { x: pos.x - 100, y: pos.y - 32 } };
  });
}

type GraphCanvasProps = {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  matchedNodeIds: string[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  emptyMessage: string;
  disabled?: boolean;
};

export function GraphCanvas({
  nodes: rawNodes,
  edges: rawEdges,
  matchedNodeIds,
  selectedNodeId,
  onSelectNode,
  emptyMessage,
  disabled = false,
}: GraphCanvasProps) {
  const renderState = validateRenderableGraph({
    nodes: rawNodes,
    visibleEdges: rawEdges,
    matchedNodeIds,
  });

  const initialNodes = useMemo(() => {
    if (renderState.state === "invalid") return [];
    const xyflowNodes = toXYFlowNodes(rawNodes, selectedNodeId);
    const xyflowEdges = toXYFlowEdges(rawEdges);
    return applyDagreLayout(xyflowNodes, xyflowEdges);
  }, [rawNodes, rawEdges, selectedNodeId, renderState.state]);

  const initialEdges = useMemo(() => {
    if (renderState.state === "invalid") return [];
    return toXYFlowEdges(rawEdges);
  }, [rawEdges, renderState.state]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (disabled) return;
      onSelectNode(node.id);
    },
    [onSelectNode, disabled],
  );

  if (renderState.state === "invalid") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm gap-1">
        <span className="text-xl opacity-30">⊘</span>
        <span>{rawNodes.length === 0 ? emptyMessage : renderState.message}</span>
        {rawNodes.length === 0 && <span className="text-text-muted text-xs opacity-60">Run /comprehend to generate</span>}
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={disabled ? undefined : onNodesChange}
        onEdgesChange={disabled ? undefined : onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes as any}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={!disabled}
        nodesConnectable={false}
        elementsSelectable={!disabled}
        panOnDrag={!disabled}
        zoomOnScroll={!disabled}
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272A" gap={20} />
        <Controls className="!bottom-3 !right-3 !z-10" />
        <MiniMap
          nodeColor={(node) => {
            const kind = (node.data as any)?.kind as string;
            if (kind === "document") return "#A1A1AA";
            if (kind === "concept") return "#6366F1";
            if (kind === "argument") return "#F59E0B";
            if (kind === "question") return "#10B981";
            return "#3F3F46";
          }}
          maskColor="rgba(9,9,11,0.08)"
          style={{ background: "#18181B" }}
        />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server + typecheck**

```bash
npm run typecheck --workspace @text-comprehend/dashboard
npm run dev --workspace @text-comprehend/dashboard
```

- [ ] **Phase 4 Gate: Playwright screenshot + user review**

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
```

Expected: Graph canvas with real nodes (document + concepts + arguments + questions), dagre layout, dot grid background, minimap, controls. Impeccable-compliant node design with 2px top accent + colored dots.

- [ ] **Commit**

```bash
git add packages/dashboard/src/features/graph-canvas.tsx
git commit -m "feat(dashboard): rewrite GraphCanvas with xyflow, dagre, and impeccable nodes"
```

**Wait for user approval before proceeding.**

---

### Phase 5: Detail Panel — Tabs + Markdown + Comprehension

#### Task 5.1: Rewrite DetailPanelShell with tabs

**Files:**
- Rewrite: `packages/dashboard/src/features/detail-panel-shell.tsx`

- [ ] **Step 1: Write new DetailPanelShell.tsx**

```typescript
import { useState, useEffect } from "react";
import type { DashboardDocument } from "../data/types";
import { renderMarkdown } from "./markdown-renderer";
import { ComprehensionCheck } from "./comprehension-check";

export type DetailSelection = {
  kind: string;
  label: string;
  documentTitle: string;
};

type TabKey = "summary" | "glossary" | "arguments" | "questions";

const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "Layered Summary" },
  { key: "glossary", label: "Concept Glossary" },
  { key: "arguments", label: "Argument Map" },
  { key: "questions", label: "Comprehension Check" },
];

type DetailPanelShellProps = {
  document: DashboardDocument | null;
  selectedNodeId: string | null;
  selection: DetailSelection | null;
};

export function DetailPanelShell({ document, selectedNodeId, selection }: DetailPanelShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  useEffect(() => {
    setActiveTab("summary");
  }, [document?.id]);

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm gap-1">
        <span className="text-xl opacity-30">⊘</span>
        <span>Select a document from the sidebar</span>
        <span className="text-text-muted text-xs opacity-60">to view its details</span>
      </div>
    );
  }

  if (document.detail.state === "degraded") {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-accent-danger/8 border-b border-accent-danger/15">
          <p className="text-accent-danger text-xs font-semibold">Document detail unavailable</p>
          <p className="text-text-secondary text-[11px] mt-1 font-mono">{document.detail.path}</p>
          <p className="text-text-muted text-[11px]">{document.detail.error}</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Re-run /comprehend --retry-failed to attempt recovery
        </div>
      </div>
    );
  }

  const simplified = document.detail.simplified;

  const contentForTab = (tab: TabKey): string => {
    switch (tab) {
      case "summary": return simplified.layeredSummary;
      case "glossary": return simplified.conceptGlossary;
      case "arguments": return simplified.argumentMap;
      case "questions": return simplified.comprehensionCheck;
    }
  };

  const currentTabIndex = TABS.findIndex((t) => t.key === activeTab);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let next = currentTabIndex;
    if (e.key === "ArrowRight") next = (currentTabIndex + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (currentTabIndex - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(TABS[next].key);
    window.document.getElementById(`tab-${TABS[next].key}`)?.focus();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Info bar */}
      <div className="h-8 flex items-center px-4 gap-3 text-[11px] text-text-secondary border-b border-surface-raised shrink-0">
        <span>Selected: <strong className="text-text-primary font-semibold">{selection?.label ?? "none"}</strong></span>
        {selection && (
          <>
            <span className="text-border-default">|</span>
            <span>Type: <strong className="text-text-primary font-semibold">{selection.kind}</strong></span>
            <span className="text-border-default">|</span>
            <span>Document: <strong className="text-text-primary font-semibold">{selection.documentTitle}</strong></span>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-surface-raised shrink-0" role="tablist" aria-label="Detail sections" onKeyDown={handleKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            tabIndex={activeTab === tab.key ? 0 : -1}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-mono text-xs transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.key ? "text-accent-primary border-accent-primary font-semibold" : "text-text-muted border-transparent hover:text-text-secondary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "questions" ? (
          <ComprehensionCheck questions={document.questions} />
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none text-sm text-text-secondary leading-relaxed [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-text-primary [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-text-primary [&_code]:font-mono [&_code]:text-xs [&_code]:bg-surface-raised [&_code]:px-1 [&_code]:rounded [&_strong]:text-text-primary"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(contentForTab(activeTab)) }}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/features/detail-panel-shell.tsx
git commit -m "feat(dashboard): rewrite DetailPanelShell with Tailwind tabs and markdown"
```

---

#### Task 5.2: Rewrite ComprehensionCheck with Tailwind

**Files:**
- Rewrite: `packages/dashboard/src/features/comprehension-check.tsx`

- [ ] **Step 1: Write new ComprehensionCheck.tsx**

```typescript
import { useState } from "react";

type Question = {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  facet: string;
  sourceRefs?: unknown[];
};

type ComprehensionCheckProps = {
  questions: Question[];
};

function difficultyStyle(d: string): string {
  if (d === "intermediate") return "bg-accent-warning/15 text-accent-warning";
  if (d === "advanced") return "bg-accent-danger/10 text-accent-danger";
  return "bg-accent-success/10 text-accent-success";
}

export function ComprehensionCheck({ questions }: ComprehensionCheckProps) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setRevealed((prev) => {
    const next = new Set(prev);
    prev.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const showAll = () => setRevealed(new Set(questions.map((q) => q.id)));
  const hideAll = () => setRevealed(new Set());

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        No comprehension questions were generated for this document.
      </div>
    );
  }

  const counts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ");

  return (
    <div className="py-2">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap px-3 py-2 bg-surface-raised rounded-md text-xs text-text-secondary mb-3">
        <span>{questions.length} questions</span>
        <span className="text-border-default" aria-hidden="true">|</span>
        <span>{summary}</span>
        <span className="text-border-default" aria-hidden="true">|</span>
        <span>Revealed: {revealed.size} of {questions.length}</span>
        <span className="flex-1" />
        {revealed.size === questions.length ? (
          <button onClick={hideAll} className="text-[10px] px-2.5 py-1 border border-border-default rounded text-text-secondary hover:text-text-primary transition-colors">
            Hide All
          </button>
        ) : (
          <button onClick={showAll} className="text-[10px] px-2.5 py-1 border border-border-default rounded text-text-secondary hover:text-text-primary transition-colors">
            Show All
          </button>
        )}
      </div>

      {/* Question cards */}
      {questions.map((q, i) => (
        <div key={q.id} className="border border-surface-raised rounded-md mb-2 overflow-hidden">
          <div className="flex items-start gap-3 p-3">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 font-mono mt-px ${difficultyStyle(q.difficulty)}`}>
              {q.difficulty}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary m-0">
                {i + 1}. {q.question}
              </p>
              {revealed.has(q.id) && (
                <div className="mt-2 p-3 bg-accent-success/8 border-t-2 border-accent-success rounded" style={{ borderTopWidth: 2 }}>
                  <p className="text-sm text-text-secondary m-0">{q.answer}</p>
                </div>
              )}
              {revealed.has(q.id) ? (
                <button onClick={() => toggle(q.id)} className="mt-2 text-[10px] px-2.5 py-1 bg-surface-raised border border-surface-raised rounded text-text-secondary hover:bg-surface-panel transition-colors">
                  Hide Answer
                </button>
              ) : (
                <button onClick={() => toggle(q.id)} className="mt-2 text-[10px] px-2.5 py-1 bg-accent-primary text-white rounded hover:opacity-90 transition-colors">
                  Show Answer
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run dev server, verify tabs and comprehension**

```bash
npm run dev --workspace @text-comprehend/dashboard
```

- [ ] **Phase 5 Gate: Playwright screenshot + user review**

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
```

Expected: Clicking a document shows detail panel with info bar + 4 tabs. Tab switching works. Markdown content rendered in summary/glossary/arguments tabs. Comprehension Check tab shows Q&A cards with reveal/hide toggles.

- [ ] **Commit**

```bash
git add packages/dashboard/src/features/comprehension-check.tsx
git commit -m "feat(dashboard): rewrite ComprehensionCheck with Tailwind dark cards"
```

**Wait for user approval before proceeding.**

---

### Phase 6: Tests, Typecheck, Final Polish

#### Task 6.1: Fix all tests

**Files:**
- Rewrite: `packages/dashboard/src/App.test.tsx`
- Rewrite: `packages/dashboard/src/features/dashboard-shell.test.tsx`
- Rewrite: `packages/dashboard/src/features/graph-canvas.test.tsx`
- Rewrite: `packages/dashboard/src/features/search-controls.test.tsx`
- Rewrite: `packages/dashboard/src/features/facet-toggle-group.test.tsx`
- Rewrite: `packages/dashboard/src/features/source-status-badge.test.tsx`
- Rewrite: `packages/dashboard/src/features/detail-panel-shell.test.tsx`
- Rewrite: `packages/dashboard/src/features/comprehension-check.test.tsx`

- [ ] **Step 1: Run all tests to see failures**

```bash
npm run test --workspace @text-comprehend/dashboard 2>&1
```

- [ ] **Step 2: Fix each test file — update selectors for Tailwind DOM**

For each failing test, replace CSS module class selectors with Tailwind class-based queries (e.g., use `screen.getByText`, `container.querySelector`, role queries). Add `vi.mock("@xyflow/react", ...)` or `ReactFlowProvider` wrappers for graph-canvas tests.

- [ ] **Step 3: Verify all tests pass**

```bash
npm run test --workspace @text-comprehend/dashboard 2>&1
```

Expected: All test files pass. 0 failures.

- [ ] **Step 4: Run full typecheck**

```bash
npm run typecheck
```

Expected: Exit 0, no errors.

- [ ] **Step 5: Run build**

```bash
npm run build --workspace @text-comprehend/dashboard
```

Expected: Vite builds successfully.

- [ ] **Phase 6 Gate: Final verification**

```bash
npx playwright-cli open http://localhost:5173
npx playwright-cli screenshot
npm run dev --workspace @text-comprehend/dashboard
```

- [ ] **Commit**

```bash
git add -A packages/dashboard/src/
git commit -m "chore(dashboard): fix all tests and final polish for Tailwind rewrite"
```
