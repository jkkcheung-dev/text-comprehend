# Dashboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the functional-but-unstyled dashboard into a polished, visually-rendered knowledge-graph explorer using CSS Modules, @xyflow/react graph rendering, tabbed artifact viewing, and interactive comprehension checks.

**Architecture:** CSS Modules + design tokens for consistent styling. @xyflow/react + dagre for visual graph with custom node types per facet. Tabbed detail panel surfacing all 4 pipeline artifacts. Graph-view-model.ts pure logic layer remains untouched — xyflow consumes the same `GraphNodeRecord[]` / `GraphEdgeRecord[]` output.

**Tech Stack:** React 19, Vite 7, TypeScript, @xyflow/react ^12.x, @dagrejs/dagre ^1.x, CSS Modules (Vite native), Fira Code + Fira Sans (Google Fonts)

---

## File Structure

```
packages/dashboard/src/
├── styles/
│   ├── tokens.css              ← NEW: CSS custom properties
│   └── reset.css               ← NEW: box-sizing, margin, font reset
├── features/
│   ├── graph-canvas.tsx        ← REWRITE: xyflow + dagre replaces text list
│   ├── graph-canvas.module.css ← NEW
│   ├── graph-nodes/
│   │   ├── DocumentNode.tsx    ← NEW: xyflow custom node
│   │   ├── ConceptNode.tsx     ← NEW
│   │   ├── ArgumentNode.tsx    ← NEW
│   │   └── QuestionNode.tsx    ← NEW
│   ├── comprehension-check.tsx  ← NEW: reveal-on-demand Q&A list
│   ├── comprehension-check.test.tsx ← NEW
│   ├── comprehension-check.module.css ← NEW
│   ├── markdown-renderer.ts    ← NEW: minimal inline md→HTML
│   ├── markdown-renderer.test.ts ← NEW
│   ├── dashboard-shell.tsx     ← MODIFY: import CSS module, no structural change
│   ├── dashboard-shell.module.css ← NEW
│   ├── detail-panel-shell.tsx  ← MODIFY: add tab bar, wire 4 artifacts
│   ├── detail-panel-shell.module.css ← NEW
│   ├── detail-panel-shell.test.tsx ← MODIFY: add tab tests
│   ├── search-controls.tsx     ← MODIFY: import CSS module
│   ├── search-controls.module.css ← NEW
│   ├── facet-toggle-group.tsx  ← MODIFY: import CSS module
│   ├── facet-toggle-group.module.css ← NEW
│   ├── source-status-badge.tsx ← MODIFY: import CSS module
│   ├── source-status-badge.module.css ← NEW
│   ├── graph-view-model.ts     ← NO CHANGES
│   └── graph-view-model.test.ts ← NO CHANGES
├── App.tsx                     ← MODIFY: import reset.css
├── App.module.css              ← NEW
├── App.test.tsx                ← MODIFY: minor updates for new UI
├── main.tsx                    ← NO CHANGES
├── data/
│   ├── types.ts                ← NO CHANGES
│   ├── load-dashboard-data.ts  ← NO CHANGES
│   └── ...                     ← NO CHANGES
└── test/factories.ts           ← MODIFY: add helpers for new component tests
package.json                    ← MODIFY: add 2 deps
index.html                      ← MODIFY: add Google Fonts link
```

---

### Task 1: Add dependencies and Google Fonts

**Files:**
- Modify: `packages/dashboard/package.json`
- Modify: `packages/dashboard/index.html`

- [ ] **Step 1: Add @xyflow/react and @dagrejs/dagre to package.json**

```bash
npm install --workspace @text-comprehend/dashboard @xyflow/react @dagrejs/dagre
```

Expected: dependencies installed, package.json updated with `"@xyflow/react": "^12.x"` and `"@dagrejs/dagre": "^1.x"`.

- [ ] **Step 2: Add Google Fonts link to index.html**

In `packages/dashboard/index.html`, add inside `<head>` after the meta viewport tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: Verify install**

Run: `npm ls @xyflow/react @dagrejs/dagre --workspace @text-comprehend/dashboard`
Expected: Both listed as direct dependencies.

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard/package.json packages/dashboard/package-lock.json packages/dashboard/index.html
git commit -m "feat(dashboard): add xyflow, dagre, and Fira font family"
```

---

### Task 2: Create design tokens and reset CSS

**Files:**
- Create: `packages/dashboard/src/styles/tokens.css`
- Create: `packages/dashboard/src/styles/reset.css`
- Modify: `packages/dashboard/src/App.tsx`

- [ ] **Step 1: Create tokens.css**

File: `packages/dashboard/src/styles/tokens.css`

```css
:root {
  --color-primary: #1E40AF;
  --color-primary-light: #3B82F6;
  --color-primary-dark: #1E3A8A;
  --color-cta: #F59E0B;
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-sidebar: #F1F5F9;
  --color-text-primary: #1E3A8A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;
  --color-border: #CBD5E1;
  --color-border-light: #E2E8F0;
  --color-success: #22C55E;
  --color-danger: #EF4444;

  --color-document: #1E40AF;
  --color-document-bg: #DBEAFE;
  --color-concept: #7C3AED;
  --color-concept-bg: #F3E8FF;
  --color-argument: #F59E0B;
  --color-argument-bg: #FEF3C7;
  --color-question: #10B981;
  --color-question-bg: #D1FAE5;

  --font-sans: 'Fira Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'Fira Code', ui-monospace, monospace;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  --text-xs: 0.625rem;
  --text-sm: 0.75rem;
  --text-base: 0.8125rem;
  --text-lg: 0.9375rem;
  --text-xl: 1.0625rem;
  --text-2xl: 1.25rem;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.08);

  --header-height: 48px;
  --sidebar-width: 240px;
  --detail-min-height: 192px;
}
```

- [ ] **Step 2: Create reset.css**

File: `packages/dashboard/src/styles/reset.css`

```css
@import './tokens.css';

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-sans);
  font-size: 16px;
  color: var(--color-text-primary);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input {
  font-family: inherit;
}

ul {
  list-style: none;
}

pre {
  font-family: var(--font-mono);
}
```

- [ ] **Step 3: Import reset.css in App.tsx**

In `packages/dashboard/src/App.tsx`, add as first import:

```typescript
import "./styles/reset.css";
```

Insert this as line 1, before the existing `import { useEffect, useState } from "react";`.

- [ ] **Step 4: Verify build succeeds**

Run: `npm run typecheck --workspace @text-comprehend/dashboard`

Expected: exit 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/src/styles/ packages/dashboard/src/App.tsx
git commit -m "feat(dashboard): add design tokens and CSS reset"
```

---

### Task 3: Style existing components with CSS Modules

**Files:**
- Create: `packages/dashboard/src/App.module.css`
- Create: `packages/dashboard/src/features/dashboard-shell.module.css`
- Create: `packages/dashboard/src/features/search-controls.module.css`
- Create: `packages/dashboard/src/features/facet-toggle-group.module.css`
- Create: `packages/dashboard/src/features/source-status-badge.module.css`
- Modify: `packages/dashboard/src/features/dashboard-shell.tsx`
- Modify: `packages/dashboard/src/features/search-controls.tsx`
- Modify: `packages/dashboard/src/features/facet-toggle-group.tsx`
- Modify: `packages/dashboard/src/features/source-status-badge.tsx`

- [ ] **Step 1: Create App.module.css**

File: `packages/dashboard/src/App.module.css`

```css
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
```

- [ ] **Step 2: Create dashboard-shell.module.css**

File: `packages/dashboard/src/features/dashboard-shell.module.css`

```css
.header {
  display: flex;
  align-items: center;
  height: var(--header-height);
  padding: 0 var(--space-lg);
  background: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--text-sm);
  position: sticky;
  top: 0;
  z-index: 10;
  gap: var(--space-md);
  flex-shrink: 0;
}

.logo {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-base);
  white-space: nowrap;
}

.headerSpacer {
  flex: 1;
}

.headerLabel {
  font-size: var(--text-xs);
  opacity: 0.7;
}

.headerRefresh {
  font-size: var(--text-xs);
  background: none;
  border: none;
  color: inherit;
  opacity: 0.7;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
}

.headerRefresh:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-sidebar);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebarSection {
  padding: var(--space-md);
}

.sidebarSection + .sidebarSection {
  border-top: 1px solid var(--color-border);
}

.sidebarTitle {
  font-weight: 600;
  color: var(--color-primary-dark);
  text-transform: uppercase;
  font-size: var(--text-xs);
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
}

.documentList {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.documentButton {
  width: 100%;
  text-align: left;
  padding: 6px var(--space-sm);
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 150ms ease;
}

.documentButton:hover {
  background: var(--color-border-light);
}

.documentButton[aria-current="true"] {
  background: var(--color-document-bg);
  color: var(--color-primary);
  font-weight: 500;
}

.sidebarFooter {
  margin-top: auto;
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.mainContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.graphArea {
  flex: 1;
  position: relative;
  border-bottom: 1px solid var(--color-border);
  min-height: 0;
}

.detailArea {
  height: 40vh;
  min-height: var(--detail-min-height);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detailAreaCollapsed {
  height: var(--detail-min-height);
}

.zoomIndicator {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-md);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.warningBanner {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-xs);
  background: var(--color-argument-bg);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.warningBanner button {
  font-size: var(--text-xs);
  padding: 2px var(--space-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}

.refreshButton {
  position: absolute;
  top: var(--space-sm);
  left: var(--space-md);
  font-size: var(--text-xs);
  padding: 4px var(--space-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

.refreshButton:hover {
  background: var(--color-sidebar);
}

.stateMessage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--text-base);
  color: var(--color-text-muted);
}

.errorAlert {
  padding: var(--space-xl);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.previewNotice {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: var(--color-sidebar);
}
```

- [ ] **Step 3: Create search-controls.module.css**

File: `packages/dashboard/src/features/search-controls.module.css`

```css
.wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  max-width: 320px;
  width: 100%;
}

.input {
  flex: 1;
  padding: 4px var(--space-sm);
  font-size: var(--text-sm);
  border: 1px solid var(--color-primary-dark);
  border-radius: var(--radius-sm);
  background: var(--color-primary-dark);
  color: var(--color-surface);
  outline: none;
  font-family: inherit;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.input:focus {
  background: rgba(255, 255, 255, 0.1);
}

.clearButton {
  font-size: var(--text-xs);
  padding: 2px var(--space-sm);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
}

.clearButton:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-surface);
}

.clearButton:disabled {
  opacity: 0.3;
  cursor: default;
}
```

- [ ] **Step 4: Create facet-toggle-group.module.css**

File: `packages/dashboard/src/features/facet-toggle-group.module.css`

```css
.fieldset {
  border: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legend {
  font-weight: 600;
  color: var(--color-primary-dark);
  text-transform: uppercase;
  font-size: var(--text-xs);
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
}

.label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 2px 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.label input[type="checkbox"] {
  accent-color: var(--color-primary);
}

.colorDot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Create source-status-badge.module.css**

File: `packages/dashboard/src/features/source-status-badge.module.css`

```css
.badge {
  display: inline-block;
  font-size: var(--text-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-sm);
  font-weight: 500;
  white-space: nowrap;
}

.fixture {
  background: var(--color-document-bg);
  color: var(--color-primary);
}

.workspace {
  background: #D1FAE5;
  color: #166534;
}
```

- [ ] **Step 6: Update components to import CSS modules**

**dashboard-shell.tsx** — Add import and apply classes. Rewrite the JSX in the return statement to use CSS modules. Key change: add `import styles from "./dashboard-shell.module.css";` at top, then replace structure:

Current structure is `<main>`, `<header>`, `<section>`, `<aside>`, `<section>`. New structure uses the CSS class names defined above. The full replacement of the return JSX (lines 158-252 in current file):

```tsx
import styles from "./dashboard-shell.module.css";

// ... in render:

return (
  <div className={styles.app}>
    <header className={styles.header}>
      <span className={styles.logo}>Text Comprehend</span>
      <SearchControls
        query={searchQuery}
        onQueryChange={onSearchQueryChange ?? (() => {})}
        onReset={onResetSearch ?? (() => {})}
        disabled={!hasSearchControls}
      />
      <span className={styles.headerSpacer} />
      <SourceStatusBadge source={data.source} />
      {data.source.mode === "workspace" && (
        <span className={styles.headerLabel}>{data.source.workspaceRoot}</span>
      )}
      {data.state === "ready" && onRefresh && (
        <button type="button" className={styles.headerRefresh} onClick={onRefresh}>
          Refresh
        </button>
      )}
    </header>

    <div className={styles.body}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <h2 className={styles.sidebarTitle}>Documents</h2>
          {data.state === "ready" ? (
            <ul className={styles.documentList}>
              {visibleDocuments.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    className={styles.documentButton}
                    aria-current={effectiveSelectedDocumentId === document.id ? "true" : undefined}
                    onClick={() => onSelectDocument(document.id)}
                  >
                    {documentButtonLabels.get(document.id) ?? document.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.stateMessage}>Document list unavailable until dashboard data is ready.</p>
          )}
        </div>
        <div className={styles.sidebarSection}>
          <FacetToggleGroup
            facets={facets}
            onFacetChange={onFacetChange ?? (() => {})}
            disabled={!hasFacetControls}
          />
        </div>
        <div className={styles.sidebarFooter}>
          <h2 className={styles.sidebarTitle}>Source</h2>
          <p>{data.source.mode === "fixture" ? data.source.fixtureName : data.source.workspaceRoot}</p>
        </div>
      </aside>

      <div className={styles.mainContent}>
        <div className={styles.graphArea}>
          {refreshWarning && (
            <div className={styles.warningBanner} role="status">
              <span>{refreshWarning}</span>
              {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
            </div>
          )}
          {data.state === "loading" && (
            <p className={styles.stateMessage}>Loading dashboard data...</p>
          )}
          {data.state === "empty" && (
            <p className={styles.stateMessage}>Run /comprehend in your workspace to generate dashboard artifacts.</p>
          )}
          {data.state === "malformed" && (
            <div className={styles.errorAlert} role="alert">
              <p>Dashboard data could not be loaded</p>
              <p>{data.path}</p>
              <p>{data.error}</p>
            </div>
          )}
          {data.state === "ready" && (
            <>
              {onRefresh && (
                <button type="button" className={styles.refreshButton} onClick={onRefresh}>
                  Refresh data
                </button>
              )}
              {showPreviewNotice && (
                <p className={styles.previewNotice}>
                  Search, facet filters, and graph node selection will be available after app wiring lands.
                </p>
              )}
              {viewState && <p className={styles.zoomIndicator}>Zoom: {viewState.zoom.toFixed(1)}x</p>}
              <GraphCanvas
                nodes={visibleGraph?.nodes ?? []}
                edges={visibleGraph?.visibleEdges ?? []}
                matchedNodeIds={visibleGraph?.matchedNodeIds ?? []}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode ?? (() => {})}
                viewState={viewState}
                onViewStateChange={onViewStateChange}
                emptyMessage={graphEmptyMessage}
                disabled={!hasGraphSelection}
              />
            </>
          )}
        </div>
        <div className={styles.detailArea}>
          <DetailPanelShell document={selectedDocument} selectedNodeId={selectedNodeId} selection={effectiveDetailSelection} />
        </div>
      </div>
    </div>
  </div>
);
```

Remove the `<main>` wrapper; the outer `<div className={styles.app}>` replaces it. Remove the `<h1>` — the `.logo` span in the header replaces it. Remove the old `<h2>Graph canvas</h2>` heading in the graph area. Remove the old `<h2>Source details</h2>` — the `.sidebarTitle` in `.sidebarFooter` replaces it.

**search-controls.tsx** — Add `import styles from "./search-controls.module.css";` and apply:

```tsx
import styles from "./search-controls.module.css";

export function SearchControls({ query, onQueryChange, onReset, disabled = false }: SearchControlsProps) {
  return (
    <div className={styles.wrapper}>
      <input
        type="search"
        className={styles.input}
        value={query}
        disabled={disabled}
        placeholder="Search graph..."
        aria-label="Search graph"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <button type="button" className={styles.clearButton} onClick={onReset} disabled={disabled}>
        Clear
      </button>
    </div>
  );
}
```

This replaces the old `<div>`, `<label>`, and `<button>` structure. The input gains `placeholder="Search graph..."` and `aria-label`. The old label wrapping the input is removed — the `aria-label` handles that.

**facet-toggle-group.tsx** — Add `import styles from "./facet-toggle-group.module.css";` and apply:

```tsx
import styles from "./facet-toggle-group.module.css";

const facetColors: Record<keyof GraphFacetState, string> = {
  documents: "var(--color-document)",
  concepts: "var(--color-concept)",
  arguments: "var(--color-argument)",
  questions: "var(--color-question)",
};

export function FacetToggleGroup({ facets, onFacetChange, disabled = false }: FacetToggleGroupProps) {
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>Visible Node Types</legend>
      {facetKeys.map((facetKey) => (
        <label key={facetKey} className={styles.label}>
          <span className={styles.colorDot} style={{ background: facetColors[facetKey] }} />
          <input
            type="checkbox"
            checked={facets[facetKey]}
            disabled={disabled}
            onChange={(event) => onFacetChange(facetKey, event.target.checked)}
          />
          {facetLabels[facetKey]}
        </label>
      ))}
    </fieldset>
  );
}
```

**source-status-badge.tsx** — Add `import styles from "./source-status-badge.module.css";` and apply:

```tsx
import styles from "./source-status-badge.module.css";

export function SourceStatusBadge({ source }: SourceStatusBadgeProps) {
  const modeClass = source.mode === "fixture" ? styles.fixture : styles.workspace;
  return <span className={`${styles.badge} ${modeClass}`}>{source.mode === "fixture" ? "Fixture" : "Workspace"}</span>;
}
```

- [ ] **Step 7: Verify tests pass with new CSS modules**

Run: `npm run test --workspace @text-comprehend/dashboard`

Some dashboard-shell tests may need updates because the DOM structure changed (removed `<main>`, `<h1>`, `<h2>` elements, changed `<p>` badge to `<span>`, removed `<label>` wrapping search input). The tests that query `role="heading"` or look for specific text content inside specific element types may fail.

If tests fail due to DOM restructuring, update the test selectors:

- `dashboard-shell.test.tsx` line referencing `<h1>Text Comprehend</h1>` → find by text content or `.logo` class
- `source-status-badge.test.tsx` line referencing `<p>Fixture</p>` → find by text content or `.badge` class
- `search-controls.test.tsx` lines referencing `<label>` wrapping input → find by `aria-label="Search graph"`
- `dashboard-shell.test.tsx` lines referencing `<h2>Graph canvas</h2>` → remove heading check

- [ ] **Step 8: Commit**

```bash
git add packages/dashboard/src/features/
git commit -m "feat(dashboard): add CSS modules for all existing components with design tokens"
```

---

### Task 4: Write markdown-renderer utility (TDD)

**Files:**
- Create: `packages/dashboard/src/features/markdown-renderer.test.ts`
- Create: `packages/dashboard/src/features/markdown-renderer.ts`

- [ ] **Step 1: Write failing test**

File: `packages/dashboard/src/features/markdown-renderer.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown-renderer";

describe("renderMarkdown", () => {
  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });

  it("wraps paragraph text in <p>", () => {
    const result = renderMarkdown("Hello world");
    expect(result).toBe("<p>Hello world</p>");
  });

  it("splits double-newline paragraphs into separate <p> tags", () => {
    const result = renderMarkdown("Line one\n\nLine two");
    expect(result).toBe("<p>Line one</p>\n<p>Line two</p>");
  });

  it("converts headings", () => {
    expect(renderMarkdown("# Heading 1")).toBe("<h3>Heading 1</h3>");
    expect(renderMarkdown("## Heading 2")).toBe("<h3>Heading 2</h3>");
    expect(renderMarkdown("### Heading 3")).toBe("<h4>Heading 3</h4>");
  });

  it("converts bold text", () => {
    const result = renderMarkdown("This is **bold** text");
    expect(result).toBe("<p>This is <strong>bold</strong> text</p>");
  });

  it("converts italic text", () => {
    const result = renderMarkdown("This is *italic* text");
    expect(result).toBe("<p>This is <em>italic</em> text</p>");
  });

  it("converts inline code", () => {
    const result = renderMarkdown("Use `npm install` to start");
    expect(result).toBe("<p>Use <code>npm install</code> to start</p>");
  });

  it("converts unordered list items", () => {
    const result = renderMarkdown("- Item one\n- Item two\n- Item three");
    expect(result).toBe("<ul><li>Item one</li>\n<li>Item two</li>\n<li>Item three</li></ul>");
  });

  it("does not convert asterisks inside words", () => {
    const result = renderMarkdown("file*.txt and **bold**");
    expect(result).toBe("<p>file*.txt and <strong>bold</strong></p>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/markdown-renderer.test.ts --root packages/dashboard`

Expected: FAIL — "Cannot find module './markdown-renderer'"

- [ ] **Step 3: Implement minimal markdown-renderer.ts**

File: `packages/dashboard/src/features/markdown-renderer.ts`

```typescript
export function renderMarkdown(content: string): string {
  if (!content) return "";

  const html = content
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h4>${line.slice(4)}</h4>`;
      if (line.startsWith("## ")) return `<h3>${line.slice(3)}</h3>`;
      if (line.startsWith("# ")) return `<h3>${line.slice(2)}</h3>`;
      return line;
    })
    .join("\n");

  const withBold = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  const withCode = withItalic.replace(/`(.+?)`/g, "<code>$1</code>");

  const trimmed = withCode.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("<ul>")) return trimmed;

  if (trimmed.startsWith("- ")) {
    const items = trimmed
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => `<li>${line.slice(2)}</li>`)
      .join("\n");
    return `<ul>${items}</ul>`;
  }

  const paragraphs = trimmed.split("\n\n").map((p) => {
    const clean = p.replace(/\n/g, " ").trim();
    if (!clean) return "";
    if (clean.startsWith("<h") || clean.startsWith("<ul")) return clean;
    return `<p>${clean}</p>`;
  });

  return paragraphs.filter(Boolean).join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/markdown-renderer.test.ts --root packages/dashboard`

Expected: PASS — all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/src/features/markdown-renderer.ts packages/dashboard/src/features/markdown-renderer.test.ts
git commit -m "feat(dashboard): add minimal markdown-to-HTML renderer"
```

---

### Task 5: Create ComprehensionCheck component (TDD)

**Files:**
- Create: `packages/dashboard/src/features/comprehension-check.test.tsx`
- Create: `packages/dashboard/src/features/comprehension-check.tsx`
- Create: `packages/dashboard/src/features/comprehension-check.module.css`

- [ ] **Step 1: Write failing test**

File: `packages/dashboard/src/features/comprehension-check.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComprehensionCheck } from "./comprehension-check";
import { createQuestion } from "../test/factories";

describe("ComprehensionCheck", () => {
  const questions = [
    createQuestion("q1", "What is modularity?"),
    createQuestion("q2", "Why use modules?"),
    createQuestion("q3", "What is coupling?"),
  ];

  it("renders all questions", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.getByText("What is modularity?")).toBeDefined();
    expect(screen.getByText("Why use modules?")).toBeDefined();
    expect(screen.getByText("What is coupling?")).toBeDefined();
  });

  it("shows question count and difficulty summary", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.getByText(/3 questions/)).toBeDefined();
  });

  it("answers are hidden by default", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.queryByText("Answer")).toBeNull();
  });

  it("reveals answer on Show Answer click", async () => {
    render(<ComprehensionCheck questions={questions} />);
    const buttons = screen.getAllByText("Show Answer");
    await userEvent.click(buttons[0]);
    expect(screen.getByText("Answer")).toBeDefined();
  });

  it("hides answer on Hide Answer click", async () => {
    render(<ComprehensionCheck questions={questions} />);
    await userEvent.click(screen.getAllByText("Show Answer")[0]);
    await userEvent.click(screen.getByText("Hide Answer"));
    expect(screen.queryByText("Answer")).toBeNull();
  });

  it("Show All Answers reveals all", async () => {
    render(<ComprehensionCheck questions={questions} />);
    await userEvent.click(screen.getByText("Show All"));
    expect(screen.getAllByText("Answer").length).toBe(3);
  });

  it("Hide All hides all revealed answers", async () => {
    render(<ComprehensionCheck questions={questions} />);
    await userEvent.click(screen.getByText("Show All"));
    await userEvent.click(screen.getByText("Hide All"));
    expect(screen.queryByText("Answer")).toBeNull();
  });

  it("renders difficulty badges", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.getAllByText("basic").length).toBe(3);
  });

  it("shows empty message when no questions", () => {
    render(<ComprehensionCheck questions={[]} />);
    expect(screen.getByText(/No comprehension questions/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/comprehension-check.test.tsx --root packages/dashboard`

Expected: FAIL — module not found.

- [ ] **Step 3: Create comprehension-check.module.css**

File: `packages/dashboard/src/features/comprehension-check.module.css`

```css
.wrapper {
  padding: var(--space-lg) 0;
}

.summary {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-sidebar);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.summarySeparator {
  color: var(--color-border);
}

.summarySpacer {
  flex: 1;
}

.summaryButton {
  font-size: var(--text-xs);
  padding: 4px var(--space-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.questionCard {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-sm);
  overflow: hidden;
}

.questionBody {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
}

.difficultyBadge {
  flex-shrink: 0;
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  margin-top: 1px;
}

.difficultyBasic {
  background: var(--color-question-bg);
  color: #166534;
}

.difficultyIntermediate {
  background: var(--color-argument-bg);
  color: #92400E;
}

.difficultyAdvanced {
  background: #FEE2E2;
  color: #991B1B;
}

.questionContent {
  flex: 1;
  min-width: 0;
}

.questionText {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-primary-dark);
  margin: 0;
}

.answerBox {
  margin-top: var(--space-sm);
  padding: var(--space-md);
  background: #F0FDF4;
  border-left: 3px solid var(--color-success);
  border-radius: var(--radius-sm);
}

.answerText {
  font-size: var(--text-sm);
  color: #166534;
  margin: 0;
}

.revealButton {
  font-size: var(--text-xs);
  padding: 4px var(--space-md);
  margin-top: var(--space-sm);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-surface);
}

.revealButton:hover {
  background: var(--color-primary-dark);
}

.hideButton {
  font-size: var(--text-xs);
  padding: 3px var(--space-md);
  margin-top: var(--space-sm);
  border: 1px solid var(--color-border);
  background: var(--color-border-light);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

.emptyMessage {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-xl);
}
```

- [ ] **Step 4: Create comprehension-check.tsx**

File: `packages/dashboard/src/features/comprehension-check.tsx`

```typescript
import { useState } from "react";
import styles from "./comprehension-check.module.css";

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

function difficultyClass(difficulty: string): string {
  if (difficulty === "intermediate") return styles.difficultyIntermediate;
  if (difficulty === "advanced") return styles.difficultyAdvanced;
  return styles.difficultyBasic;
}

export function ComprehensionCheck({ questions }: ComprehensionCheckProps) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const revealAll = () => setRevealedIds(new Set(questions.map((q) => q.id)));
  const hideAll = () => setRevealedIds(new Set());

  if (questions.length === 0) {
    return (
      <p className={styles.emptyMessage}>
        No comprehension questions were generated for this document.
      </p>
    );
  }

  const difficultyCounts = questions.reduce(
    (acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const difficultySummary = Object.entries(difficultyCounts)
    .map(([key, count]) => `${count} ${key}`)
    .join(", ");

  return (
    <div className={styles.wrapper}>
      <div className={styles.summary}>
        <span>{questions.length} questions</span>
        <span className={styles.summarySeparator}>|</span>
        <span>{difficultySummary}</span>
        <span className={styles.summarySeparator}>|</span>
        <span>Revealed: {revealedIds.size} of {questions.length}</span>
        <span className={styles.summarySpacer} />
        {revealedIds.size === questions.length ? (
          <button type="button" className={styles.summaryButton} onClick={hideAll}>
            Hide All
          </button>
        ) : (
          <button type="button" className={styles.summaryButton} onClick={revealAll}>
            Show All
          </button>
        )}
      </div>

      {questions.map((question, index) => (
        <div key={question.id} className={styles.questionCard}>
          <div className={styles.questionBody}>
            <span className={`${styles.difficultyBadge} ${difficultyClass(question.difficulty)}`}>
              {question.difficulty}
            </span>
            <div className={styles.questionContent}>
              <p className={styles.questionText}>
                {index + 1}. {question.question}
              </p>
              {revealedIds.has(question.id) && (
                <div className={styles.answerBox}>
                  <p className={styles.answerText}>{question.answer}</p>
                </div>
              )}
              {revealedIds.has(question.id) ? (
                <button
                  type="button"
                  className={styles.hideButton}
                  onClick={() => toggleReveal(question.id)}
                >
                  Hide Answer
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.revealButton}
                  onClick={() => toggleReveal(question.id)}
                >
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

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/comprehension-check.test.tsx --root packages/dashboard`

Expected: PASS — all 9 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard/src/features/comprehension-check.tsx packages/dashboard/src/features/comprehension-check.test.tsx packages/dashboard/src/features/comprehension-check.module.css
git commit -m "feat(dashboard): add interactive comprehension check with reveal-on-demand"
```

---

### Task 6: Create xyflow custom node components (TDD)

**Files:**
- Create: `packages/dashboard/src/features/graph-nodes/DocumentNode.tsx`
- Create: `packages/dashboard/src/features/graph-nodes/ConceptNode.tsx`
- Create: `packages/dashboard/src/features/graph-nodes/ArgumentNode.tsx`
- Create: `packages/dashboard/src/features/graph-nodes/QuestionNode.tsx`

- [ ] **Step 1: Create DocumentNode.tsx**

File: `packages/dashboard/src/features/graph-nodes/DocumentNode.tsx`

```typescript
import { Handle, Position, type NodeProps } from "@xyflow/react";

type DocumentNodeData = {
  label: string;
};

export function DocumentNode({ data, selected }: NodeProps) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `2px solid ${selected ? "var(--color-primary-light)" : "var(--color-document)"}`,
        borderLeft: `3px solid var(--color-document)`,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-md)",
        maxWidth: 220,
        fontSize: "var(--text-sm)",
      }}
    >
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 600, color: "var(--color-primary-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {data.label}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
        document
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ConceptNode.tsx**

File: `packages/dashboard/src/features/graph-nodes/ConceptNode.tsx`

```typescript
import { Handle, Position, type NodeProps } from "@xyflow/react";

type ConceptNodeData = {
  label: string;
};

export function ConceptNode({ data, selected }: NodeProps) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `2px solid ${selected ? "var(--color-primary-light)" : "var(--color-concept)"}`,
        borderLeft: `3px solid var(--color-concept)`,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-sm)",
        maxWidth: 200,
        fontSize: "var(--text-sm)",
      }}
    >
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Left} />
      <Handle type="target" position={Position.Right} />
      <div style={{ fontWeight: 600, color: "var(--color-primary-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {data.label}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
        concept
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ArgumentNode.tsx**

File: `packages/dashboard/src/features/graph-nodes/ArgumentNode.tsx`

```typescript
import { Handle, Position, type NodeProps } from "@xyflow/react";

type ArgumentNodeData = {
  label: string;
};

export function ArgumentNode({ data, selected }: NodeProps) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `2px solid ${selected ? "var(--color-primary-light)" : "var(--color-argument)"}`,
        borderLeft: `3px solid var(--color-argument)`,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-sm)",
        maxWidth: 200,
        fontSize: "var(--text-sm)",
      }}
    >
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Left} />
      <Handle type="target" position={Position.Right} />
      <div style={{ fontWeight: 600, color: "var(--color-primary-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {data.label}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
        argument
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create QuestionNode.tsx**

File: `packages/dashboard/src/features/graph-nodes/QuestionNode.tsx`

```typescript
import { Handle, Position, type NodeProps } from "@xyflow/react";

type QuestionNodeData = {
  label: string;
};

export function QuestionNode({ data, selected }: NodeProps) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `2px solid ${selected ? "var(--color-primary-light)" : "var(--color-question)"}`,
        borderLeft: `3px solid var(--color-question)`,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-sm)",
        maxWidth: 200,
        fontSize: "var(--text-sm)",
      }}
    >
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Left} />
      <Handle type="target" position={Position.Right} />
      <div style={{ fontWeight: 600, color: "var(--color-primary-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {data.label}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
        question
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run typecheck --workspace @text-comprehend/dashboard`

Expected: exit 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard/src/features/graph-nodes/
git commit -m "feat(dashboard): add xyflow custom node components for all four facet types"
```

---

### Task 7: Rewrite GraphCanvas with xyflow + dagre (TDD)

**Files:**
- Rewrite: `packages/dashboard/src/features/graph-canvas.tsx`
- Create: `packages/dashboard/src/features/graph-canvas.module.css`
- Rewrite: `packages/dashboard/src/features/graph-canvas.test.tsx`

- [ ] **Step 1: Create graph-canvas.module.css**

File: `packages/dashboard/src/features/graph-canvas.module.css`

```css
.canvas {
  width: 100%;
  height: 100%;
}

.emptyMessage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.controls {
  position: absolute;
  bottom: var(--space-lg);
  right: var(--space-lg);
  z-index: 5;
}
```

- [ ] **Step 2: Write the failing test**

File: `packages/dashboard/src/features/graph-canvas.test.tsx`

The test needs to wrap all xyflow components in `<ReactFlowProvider>`. Replace the entire file:

```typescript
import { describe, it, expect, vi } from "vitest";
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
    renderGraph({
      nodes: [createNode("doc-1:concept:c1", "Modularity")],
    });
    expect(screen.getByText("Modularity")).toBeDefined();
  });

  it("renders multiple nodes", () => {
    renderGraph({
      nodes: [
        createNode("doc-1:concept:c1", "Concept One"),
        createNode("doc-1:argument:a1", "Argument One", "argument"),
      ],
    });
    expect(screen.getByText("Concept One")).toBeDefined();
    expect(screen.getByText("Argument One")).toBeDefined();
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
    // xyflow fires onNodeClick which we forward to onSelectNode
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
    expect(container.querySelector(".react-flow__edge")).toBeTruthy();
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
    expect(pane?.classList.contains("nodrag")).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/graph-canvas.test.tsx --root packages/dashboard`

Expected: FAIL — old test expectations don't match new xyflow structure.

- [ ] **Step 4: Rewrite graph-canvas.tsx with xyflow + dagre**

File: `packages/dashboard/src/features/graph-canvas.tsx`

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
  type OnNodesChange,
  type OnEdgesChange,
  type ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { DocumentNode } from "./graph-nodes/DocumentNode";
import { ConceptNode } from "./graph-nodes/ConceptNode";
import { ArgumentNode } from "./graph-nodes/ArgumentNode";
import { QuestionNode } from "./graph-nodes/QuestionNode";
import type { GraphEdgeRecord, GraphNodeRecord } from "./graph-view-model";
import { validateRenderableGraph } from "./graph-view-model";
import styles from "./graph-canvas.module.css";

const nodeTypes = {
  documentNode: DocumentNode,
  conceptNode: ConceptNode,
  argumentNode: ArgumentNode,
  questionNode: QuestionNode,
};

const EDGE_COLORS: Record<string, string> = {
  contains: "#94A3B8",
  defines: "#7C3AED",
  depends_on: "#7C3AED",
  exemplifies: "#7C3AED",
  supports: "#F59E0B",
  contradicts: "#EF4444",
  questions: "#10B981",
};

const EDGE_DASH: Record<string, string> = {
  contains: "",
  defines: "",
  depends_on: "5,5",
  exemplifies: "2,4",
  supports: "",
  contradicts: "",
  questions: "5,5",
};

const ANIMATED_EDGES = new Set(["defines", "depends_on", "contradicts"]);

function toXYFlowNodes(records: GraphNodeRecord[]): Node[] {
  return records.map((r) => ({
    id: r.id,
    type: `${r.kind}Node` as keyof typeof nodeTypes,
    position: { x: 0, y: 0 },
    data: { label: r.label, kind: r.kind, documentId: r.documentId },
  }));
}

function toXYFlowEdges(records: GraphEdgeRecord[]): Edge[] {
  return records.map((e) => ({
    id: `${e.source}:${e.target}:${e.type}`,
    source: e.source,
    target: e.target,
    type: "smoothstep" as ConnectionLineType,
    animated: ANIMATED_EDGES.has(e.type),
    style: {
      stroke: EDGE_COLORS[e.type] ?? "#94A3B8",
      strokeDasharray: EDGE_DASH[e.type] ?? "",
    },
    label: e.type,
  }));
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) {
    g.setNode(node.id, { width: 200, height: 56 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: { x: pos.x - 100, y: pos.y - 28 },
    };
  });
}

type GraphCanvasViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type GraphCanvasProps = {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  matchedNodeIds: string[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  viewState?: GraphCanvasViewState;
  onViewStateChange?: (viewState: GraphCanvasViewState) => void;
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
    const xyflowNodes = toXYFlowNodes(rawNodes);
    const xyflowEdges = toXYFlowEdges(rawEdges);
    return applyDagreLayout(xyflowNodes, xyflowEdges);
  }, [rawNodes, rawEdges, renderState.state]);

  const initialEdges = useMemo(() => {
    if (renderState.state === "invalid") return [];
    return toXYFlowEdges(rawEdges);
  }, [rawEdges, renderState.state]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (disabled) return;
      onSelectNode(node.id);
    },
    [onSelectNode, disabled],
  );

  if (renderState.state === "invalid") {
    return <p className={styles.emptyMessage}>{rawNodes.length === 0 ? emptyMessage : renderState.message}</p>;
  }

  return (
    <div className={styles.canvas}>
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
        className={disabled ? "nodrag" : undefined}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E2E8F0" gap={20} />
        <Controls className={styles.controls} />
        <MiniMap
          nodeColor={(node) => {
            const kind = (node.data as any)?.kind as string | undefined;
            if (kind === "document") return "#1E40AF";
            if (kind === "concept") return "#7C3AED";
            if (kind === "argument") return "#F59E0B";
            if (kind === "question") return "#10B981";
            return "#94A3B8";
          }}
          maskColor="rgba(30, 64, 175, 0.08)"
          style={{ background: "#F1F5F9" }}
        />
      </ReactFlow>
    </div>
  );
}
```

Important: `@xyflow/react` v12 uses `nodeTypes` (not `nodeTypes` → it's the same). The `onNodeClick` handler signature accepts `(event: React.MouseEvent, node: Node)`. The `selected` prop on custom nodes is delivered automatically by xyflow when a node is selected — no manual wiring needed.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/graph-canvas.test.tsx --root packages/dashboard`

Expected: Some tests may need adjustment due to xyflow's virtual DOM behavior in jsdom. If node text is not found via `screen.getByText`, use `container.querySelector` to find rendered xyflow nodes.

If `getByText` fails for xyflow nodes in jsdom, update the test to use container queries:

```typescript
// In tests that use screen.getByText and fail, use:
const { container } = renderGraph({ nodes: [createNode("doc-1:concept:c1", "Modularity")] });
expect(container.textContent).toContain("Modularity");
```

This works because xyflow renders node content within its virtual DOM structure.

- [ ] **Step 6: Verify existing tests still pass**

Run: `npm run test --workspace @text-comprehend/dashboard`

Expected: Graph-canvas tests pass (may have minor failures requiring the container.textContent approach). Other test files should pass. App.test.tsx may have minor failures because it renders GraphCanvas differently — check and fix any App test failures.

For App.test.tsx failures related to GraphCanvas rendering differences, use the same `container.textContent` approach or update mock assertions.

- [ ] **Step 7: Commit**

```bash
git add packages/dashboard/src/features/graph-canvas.tsx packages/dashboard/src/features/graph-canvas.module.css packages/dashboard/src/features/graph-canvas.test.tsx
git commit -m "feat(dashboard): replace text-list graph with xyflow + dagre visual rendering"
```

---

### Task 8: Add tabs to DetailPanelShell (TDD)

**Files:**
- Modify: `packages/dashboard/src/features/detail-panel-shell.tsx`
- Create: `packages/dashboard/src/features/detail-panel-shell.module.css`
- Modify: `packages/dashboard/src/features/detail-panel-shell.test.tsx`
- Modify: `packages/dashboard/src/test/factories.ts`

- [ ] **Step 1: Add helper to factories.ts**

In `packages/dashboard/src/test/factories.ts`, add:

```typescript
export function createAvailableDetailFull(
  layeredSummary = "# Summary",
  conceptGlossary = "# Glossary",
  argumentMap = "# Arguments",
  comprehensionCheck = "# Questions",
): DashboardDocumentDetail {
  return {
    state: "available",
    simplified: { layeredSummary, conceptGlossary, argumentMap, comprehensionCheck },
  };
}
```

Place this after the existing `createAvailableDetail` function (around line 41).

- [ ] **Step 2: Create detail-panel-shell.module.css**

File: `packages/dashboard/src/features/detail-panel-shell.module.css`

```css
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.infoBar {
  display: flex;
  align-items: center;
  padding: 4px var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--text-xs);
  gap: var(--space-md);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.infoBarSeparator {
  color: var(--color-text-muted);
}

.infoBarValue {
  color: var(--color-primary-dark);
  font-weight: 600;
}

.tabBar {
  display: flex;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.tab {
  padding: 6px var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 150ms ease, border-color 150ms ease;
}

.tab:hover {
  color: var(--color-text-secondary);
}

.tabActive {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

.tabContent {
  flex: 1;
  padding: var(--space-lg);
  overflow-y: auto;
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.tabContent h3 {
  font-size: var(--text-lg);
  color: var(--color-primary-dark);
  margin: var(--space-lg) 0 var(--space-xs);
}

.tabContent h4 {
  font-size: var(--text-base);
  color: var(--color-primary);
  margin: var(--space-md) 0 var(--space-xs);
}

.emptyDoc {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.degradedMessage {
  font-size: var(--text-sm);
  color: var(--color-danger);
  padding: var(--space-lg);
}

.markdownContent {
  white-space: pre-wrap;
  word-break: break-word;
}

.markdownContent code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--color-sidebar);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
}

.markdownContent strong {
  color: var(--color-primary-dark);
}
```

- [ ] **Step 3: Write failing test for tabs**

Update `packages/dashboard/src/features/detail-panel-shell.test.tsx`. Replace the existing test file:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailPanelShell } from "./detail-panel-shell";
import { createDocument, createAvailableDetailFull, createAvailableDetail, createDegradedDetail, createConcept, createArgument, createQuestion } from "../test/factories";

describe("DetailPanelShell (with tabs)", () => {
  it("renders tab bar", () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull());
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("Layered Summary")).toBeDefined();
    expect(screen.getByText("Concept Glossary")).toBeDefined();
    expect(screen.getByText("Argument Map")).toBeDefined();
    expect(screen.getByText("Comprehension Check")).toBeDefined();
  });

  it("Layered Summary tab is active by default", () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull("# My Summary"));
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("My Summary")).toBeDefined();
  });

  it("switches to Concept Glossary tab on click", async () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull("# Summary", "# Glossary Content"));
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    await userEvent.click(screen.getByText("Concept Glossary"));
    expect(screen.getByText("Glossary Content")).toBeDefined();
  });

  it("switches to Argument Map tab on click", async () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull("# Summary", "# G", "# Argument Content"));
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    await userEvent.click(screen.getByText("Argument Map"));
    expect(screen.getByText("Argument Content")).toBeDefined();
  });

  it("switches to Comprehension Check tab on click", async () => {
    const doc = createDocument("doc-1", "Test Document", createAvailableDetailFull());
    doc.questions = [createQuestion("q1", "What is X?")];
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    await userEvent.click(screen.getByText("Comprehension Check"));
    expect(screen.getByText("What is X?")).toBeDefined();
  });

  it("shows tab content via renderMarkdown", () => {
    const doc = createDocument("doc-1", "Doc", createAvailableDetailFull("**bold** text"));
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("bold")).toBeDefined();
  });

  it("shows no-document message when document is null", () => {
    render(<DetailPanelShell document={null} selectedNodeId={null} selection={null} />);
    expect(screen.getByText(/Select a document/)).toBeDefined();
  });

  it("renders degraded message for degraded documents", () => {
    const doc = createDocument("doc-1", "Doc", createDegradedDetail("path/to/file", "Missing"));
    render(<DetailPanelShell document={doc} selectedNodeId={null} selection={null} />);
    expect(screen.getByText(/unavailable/)).toBeDefined();
  });

  it("resets to Layered Summary tab when document changes", async () => {
    const doc1 = createDocument("doc-1", "Doc One", createAvailableDetailFull("# Summary One"));
    const { rerender } = render(<DetailPanelShell document={doc1} selectedNodeId={null} selection={null} />);
    await userEvent.click(screen.getByText("Concept Glossary"));

    const doc2 = createDocument("doc-2", "Doc Two", createAvailableDetailFull("# Summary Two"));
    rerender(<DetailPanelShell document={doc2} selectedNodeId={null} selection={null} />);
    expect(screen.getByText("Summary Two")).toBeDefined();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/features/detail-panel-shell.test.tsx --root packages/dashboard`

Expected: FAIL — tabs not implemented yet, "Layered Summary" text not found.

- [ ] **Step 5: Rewrite detail-panel-shell.tsx with tabs**

File: `packages/dashboard/src/features/detail-panel-shell.tsx` — replace entirely:

```typescript
import { useState, useEffect } from "react";
import type { DashboardDocument } from "../data/types";
import { renderMarkdown } from "./markdown-renderer";
import { ComprehensionCheck } from "./comprehension-check";
import styles from "./detail-panel-shell.module.css";

export type DetailSelection =
  | { kind: "document"; label: string; documentTitle: string; filePath?: string; fileType?: string; lastAnalyzed?: string }
  | { kind: "concept"; label: string; documentTitle: string; definition: string; importance: string; sourceRefs?: any[] }
  | { kind: "argument"; label: string; documentTitle: string; argumentType: string; sourceRefs?: any[]; evidence?: any[]; assumptions: string[]; gaps: string[] }
  | { kind: "question"; label: string; documentTitle: string; answer: string; difficulty: string; facet: string; sourceRefs?: any[] };

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
      <div className={styles.panel}>
        <div className={styles.emptyDoc}>Select a document from the sidebar to view its details.</div>
      </div>
    );
  }

  if (document.detail.state === "degraded") {
    return (
      <div className={styles.panel}>
        <div className={styles.degradedMessage}>
          <p>Document detail is unavailable for this artifact.</p>
          <p>{document.detail.path}</p>
          <p>{document.detail.error}</p>
        </div>
      </div>
    );
  }

  const simplified = document.detail.simplified;
  const tabContent: Record<TabKey, string> = {
    summary: simplified.layeredSummary,
    glossary: simplified.conceptGlossary,
    arguments: simplified.argumentMap,
    questions: simplified.comprehensionCheck,
  };

  return (
    <div className={styles.panel}>
      <div className={styles.infoBar}>
        <span>
          Selected: <strong className={styles.infoBarValue}>{selection?.label ?? "none"}</strong>
        </span>
        {selection && (
          <>
            <span className={styles.infoBarSeparator}>|</span>
            <span>
              Type: <strong className={styles.infoBarValue}>{selection.kind}</strong>
            </span>
            <span className={styles.infoBarSeparator}>|</span>
            <span>
              Document: <strong className={styles.infoBarValue}>{selection.documentTitle}</strong>
            </span>
          </>
        )}
      </div>

      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === "questions" ? (
          <ComprehensionCheck questions={document.questions} />
        ) : (
          <div
            className={styles.markdownContent}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(tabContent[activeTab]) }}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/features/detail-panel-shell.test.tsx --root packages/dashboard`

Expected: All 9 tests pass.

- [ ] **Step 7: Verify all dashboard tests pass**

Run: `npm run test --workspace @text-comprehend/dashboard`

Expected: All tests pass. Fix any remaining failures from App.test.tsx or dashboard-shell.test.tsx that were affected by the DetailPanelShell DOM structure change.

- [ ] **Step 8: Commit**

```bash
git add packages/dashboard/src/features/detail-panel-shell.tsx packages/dashboard/src/features/detail-panel-shell.module.css packages/dashboard/src/features/detail-panel-shell.test.tsx packages/dashboard/src/test/factories.ts
git commit -m "feat(dashboard): add tabbed detail panel with all 4 artifact views"
```

---

### Task 9: Final verification and cleanup

**Files:**
- Modify: any files with failing tests

- [ ] **Step 1: Run full test suite**

Run: `npm run test --workspace @text-comprehend/dashboard`

Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck --workspace @text-comprehend/dashboard`

Expected: exit 0, no errors.

- [ ] **Step 3: Run build**

Run: `npm run build --workspace @text-comprehend/dashboard`

Expected: Vite builds successfully, `dist/` output produced.

- [ ] **Step 4: Fix any remaining test failures**

If tests fail, fix them individually before committing. Do NOT skip verification.

- [ ] **Step 5: Run root-level verification**

Run: `npm run typecheck` from root

Expected: exit 0, no errors across all workspaces.

- [ ] **Step 6: Commit**

```bash
git add -A packages/dashboard/
git commit -m "chore(dashboard): final cleanup after polish implementation"
```
