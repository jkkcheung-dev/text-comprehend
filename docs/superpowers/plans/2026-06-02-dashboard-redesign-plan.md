# Dashboard Redesign — Implementation Plan

**Date:** 2026-06-02
**Based on:** `docs/superpowers/specs/2026-06-02-dashboard-redesign-design.md`

## Phase Structure

Each phase produces a visible, reviewable increment. At the end of every phase:
1. `npx playwright-cli open http://localhost:5173` — automated visual check
2. `npm run dev --workspace @text-comprehend/dashboard` — user reviews live UI
3. **Wait for user approval before proceeding** to next phase

---

## Phase 1: Foundation — Tailwind v4 + Clean Slate

**Goal:** Dev server starts with a blank dark page. No CSS modules remain.

- [ ] **1.1** Install new dependencies: `zustand`, `tailwindcss@^4`, `@tailwindcss/vite`
- [ ] **1.2** Create `packages/dashboard/src/index.css` — `@import "tailwindcss"` + `@theme` block with zinc scale, accent colors, font family, spacing/radius tokens from Section 2
- [ ] **1.3** Update `packages/dashboard/src/main.tsx` — replace CSS module imports with `import "./index.css"`, keep existing React setup
- [ ] **1.4** Update `packages/dashboard/vite.config.ts` — add `@tailwindcss/vite` plugin
- [ ] **1.5** Delete all `*.module.css` files (14 files) and `packages/dashboard/src/styles/` directory
- [ ] **1.6** Rewrite `packages/dashboard/src/App.tsx` — minimal shell that renders a dark full-height `<div>` with "Text Comprehend" text to verify Tailwind is working
- [ ] **1.7** Run typecheck: `npm run typecheck --workspace @text-comprehend/dashboard`
- [ ] **1.8** **Phase gate**: playwright-cli screenshot, user review

**Target visible state:** Dark page (`bg-zinc-950`) with "Text Comprehend" text in Fira Code at top-left.

---

## Phase 2: Zustand Store + Data Wiring

**Goal:** App loads real data from fixture source, no UI yet. Pure logic.

- [ ] **2.1** Create `packages/dashboard/src/store/dashboard-store.ts` — Zustand store with all fields and actions per Section 6
- [ ] **2.2** Rewrite `App.tsx` — thin orchestrator that initializes store, calls `loadDashboardData(source)`, sets retrieved data into store, renders `<DashboardShell />` with store hooks
- [ ] **2.3** Stub `DashboardShell` — minimal component that reads from store and displays document count + graph node count in plain dark text
- [ ] **2.4** Verify data flows: add `console.log` or DOM output to confirm store populates with fixture data
- [ ] **2.5** **Phase gate**: playwright-cli screenshot, user review

**Target visible state:** Dark page showing "1 document, X nodes loaded" (fixture data).

---

## Phase 3: Shell Layout — Header + Sidebar + Structure

**Goal:** Full shell layout renders (header, sidebar, graph placeholder, detail placeholder). All Tailwind, all dark.

- [ ] **3.1** Rewrite `DashboardShell.tsx` — full layout per Section 3:
  - Header: 48px, logo (Fira Code "Text Comprehend"), search input placeholder, source badge
  - Sidebar: 220px, documents list (from store), facet toggles (checkbox + color dots), source footer
  - Main area: graph placeholder div + detail panel placeholder
- [ ] **3.2** Rewrite `SearchControls.tsx` — Tailwind-styled input with `⌘K` hint, clear button
- [ ] **3.3** Rewrite `FacetToggleGroup.tsx` — Tailwind-styled checkboxes with 7px colored dots
- [ ] **3.4** Rewrite `SourceStatusBadge.tsx` — Tailwind chip ("Fixture"/"Workspace")
- [ ] **3.5** **Phase gate**: playwright-cli screenshot, user review

**Target visible state:** Full dashboard shell: header + sidebar (real doc list + facet toggles) + empty graph area + empty detail panel. Dark theme throughout. No graph nodes yet.

---

## Phase 4: Graph Canvas — xyflow + Dagre + Custom Nodes

**Goal:** Knowledge graph renders with dagre layout, impeccable-compliant nodes, edges, minimap, controls.

- [ ] **4.1** Rewrite `graph-canvas.tsx` — per Section 4:
  - xyflow ReactFlow + dagre LR layout, toXYFlowNodes/toXYFlowEdges converters
  - Dot grid Background, Controls, MiniMap (facet-colored)
  - Edge types: color + dash + animation per Section 4
  - Empty state: centered "No graph data" message
  - Search highlight: matching nodes glow, non-matching dim to 40%
  - Facet filtering: hide/show nodes on toggle, re-layout
  - **Fix selection sync**: `selectedNodeId` prop → xyflow shows selected state reactively
- [ ] **4.2** Rewrite `DocumentNode.tsx` — impeccable-compliant: 1px zinc-700 border, 2px top zinc-400, 7px zinc dot, Fira Code label
- [ ] **4.3** Rewrite `ConceptNode.tsx` — 2px top indigo-500, indigo dot, "concept" label
- [ ] **4.4** Rewrite `ArgumentNode.tsx` — 2px top amber-500, amber dot, "argument" label
- [ ] **4.5** Rewrite `QuestionNode.tsx` — 2px top emerald-500, emerald dot, "question" label
- [ ] **4.6** **Phase gate**: playwright-cli screenshot, user review

**Target visible state:** Graph canvas renders with real nodes + edges from fixture data. Dagre left-to-right layout. Colored dot + top accent on each node. Minimap bottom-right. Controls bottom-right.

---

## Phase 5: Detail Panel — Tabs + Markdown + Comprehension

**Goal:** Bottom detail panel with info bar, 4 tabs, rendered content.

- [ ] **5.1** Rewrite `DetailPanelShell.tsx` — per Section 5:
  - Info bar (32px): Selected / Type / Document
  - Tab bar: 4 tabs with role="tab", aria-selected, keyboard nav
  - Content area: renders markdown or ComprehensionCheck based on active tab
  - Tab resets to "summary" on document change
  - Empty state: "Select a document from the sidebar"
  - Degraded state: red banner + path + error
- [ ] **5.2** Rewrite `ComprehensionCheck.tsx` — Tailwind-styled:
  - Summary bar: count | difficulty | revealed | Show All/Hide All
  - Question cards: difficulty badge (emerald/amber/red), numbered text
  - Revealed answer: green-tinted box, 2px green top border (no side-stripe)
  - Toggle buttons: "Show Answer" (blue-500), "Hide Answer" (zinc-800)
  - Empty: "No comprehension questions"
- [ ] **5.3** **Phase gate**: playwright-cli screenshot, user review

**Target visible state:** Clicking a document or node populates the detail panel. Tab switching shows markdown content (summary/glossary/arguments) and Q&A cards (questions tab). Info bar shows selected node info.

---

## Phase 6: Tests, Typecheck, Final Polish

**Goal:** All tests pass, typecheck clean, build succeeds. No regressions.

- [ ] **6.1** Run full test suite: `npm run test --workspace @text-comprehend/dashboard`
- [ ] **6.2** Fix all test failures — update selectors for Tailwind DOM, update xyflow test wrappers, fix cascade failures in App.test.tsx and dashboard-shell.test.tsx
- [ ] **6.3** Run typecheck: `npm run typecheck` (root) — fix any type errors
- [ ] **6.4** Run build: `npm run build --workspace @text-comprehend/dashboard`
- [ ] **6.5** Verify visual states: loading, empty, ready, malformed, degraded — each shows correct UI
- [ ] **6.6** **Final gates**: playwright-cli full-page screenshot, user review, commit

**Target state:** Dashboard fully functional. All tests green. Dark theme throughout. Graph renders. Tabs work. Search works. Facets filter. Clean build output.
