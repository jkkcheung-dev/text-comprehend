# Dashboard Redesign - Design Spec

**Date:** 2026-06-02
**Status:** In Progress

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Product register** (not brand) | Dashboard/tool — design serves the task, not visual impact |
| 2 | **Exploratory feel** | User opens dashboard to explore and discover connections in analyzed text |
| 3 | **Dark & Sharp** personality | Deep navy/charcoal backgrounds, monospace accents, high contrast. Developer tool precision. Ref: GitHub Dark, Linear, VS Code |
| 4 | **Anti-references: no Corporate SaaS, no reinvented affordances, no heavy color accents** | Avoid white/navy generic grids, custom scrollbars/weird controls, saturated colors on inactive elements. Use established patterns (command palette style, dark dev-tool conventions). |
| 5 | **WCAG 2.1 AA** | Semantic HTML, keyboard navigation, reasonable contrast ratios, focus indicators |
| 6 | **TailwindCSS v4** | Matches original spec. Dark theme tokens via CSS variables + Tailwind config |
| 7 | **Full rewrite** | Rebuild all React components with Tailwind v4. Keep TypeScript data layer as-is. Drop CSS modules entirely. |
| 8 | **Impeccable-compliant nodes** | Chose 2px top accent + facet dot over 3px left border. Eliminates side-stripe ban violation. |

## Section 1: Architecture & Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Vite 7 + React 19 | Already in place, stays |
| Styling | TailwindCSS v4 | Design tokens as CSS vars → Tailwind theme |
| Graph | @xyflow/react v12 + @dagrejs/dagre | Already installed, fix selection sync issue |
| State | Zustand | Centralized store replacing App.tsx useState spaghetti |
| Fonts | Fira Sans (body) + Fira Code (headings/mono) | Already installed, confirmed by ui-ux-pro-max |
| Icons | Lucide (SVG) | Clean, monoline, fits dark dev-tool aesthetic |

**Preserved (data layer, no changes):**
- `packages/dashboard/src/data/types.ts`
- `packages/dashboard/src/data/load-dashboard-data.ts`
- `packages/dashboard/src/features/graph-view-model.ts`

**Rebuilt from scratch:**
- All React components (App, DashboardShell, GraphCanvas, DetailPanelShell, SearchControls, FacetToggleGroup, SourceStatusBadge, ComprehensionCheck)
- Custom xyflow node types
- Tailwind config, entry CSS, index.html

## Section 2: Dark Palette & Typography

### Surfaces (Zinc Scale)

| Role | Token | Hex |
|------|-------|-----|
| Canvas | `--bg-canvas` | `#09090B` (zinc-950) |
| Surface | `--bg-surface` | `#18181B` (zinc-900) |
| Surface raised | `--bg-raised` | `#27272A` (zinc-800) |
| Border | `--border` | `#3F3F46` (zinc-700) |

### Text (Zinc Scale)

| Role | Token | Hex |
|------|-------|-----|
| Primary | `--text-primary` | `#FAFAFA` (zinc-50) |
| Secondary | `--text-secondary` | `#A1A1AA` (zinc-400) |
| Muted | `--text-muted` | `#71717A` (zinc-500) |

### Semantic Accents

| Role | Hex | Usage |
|------|-----|-------|
| Primary action / selection | `#3B82F6` (blue-500) | Buttons, selected state, focus rings |
| Success / answers | `#22C55E` (green-500) | Comprehension answer callouts |
| Warning / arguments | `#F59E0B` (amber-500) | Argument node borders |
| Danger / errors | `#EF4444` (red-500) | Error states, contradicts edges |

### Graph Node Colors (per facet)

| Facet | Color | Hex |
|-------|-------|-----|
| Document | Zinc | `#A1A1AA` (zinc-400) |
| Concept | Indigo | `#6366F1` (indigo-500) |
| Argument | Amber | `#F59E0B` (amber-500) |
| Question | Emerald | `#10B981` (emerald-500) |

**Node design (impeccable-compliant):**
- 1px zinc-700 border on all sides (uniform, no side-stripe)
- 2px top border in facet color
- 6px radius, 0 2px 8px rgba(0,0,0,0.5) shadow
- Label: Fira Code 13px semibold zinc-50, truncated with ellipsis
- Type indicator: 7px colored dot (facet color) + Fira Sans 11px zinc-500 text ("concept" / "argument" / "question" / "document")
- Selected state: 2px blue-500 border + box-shadow glow
- Max width: 220px, padding: 10px 16px

### Typography

- **Body/UI**: Fira Sans (300–700), 12/13/14/16/18/20/24px fixed rem scale
- **Mono/Labels**: Fira Code (400–700), node labels, code blocks, data
- **No fluid clamp** — consistent DPI per product register
- **Line height**: 1.7 for prose (detail panel), 1.4 for UI

## Section 3: Shell Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Text Comprehend]                 [search▸]     [Fixture]│ ← h-12, zinc-950, border-b zinc-700
├────────────┬────────────────────────────────────────────┤
│ DOCUMENTS  │                                            │
│ sampleText │        Interactive Mind Map (xyflow)       │
│ report.md  │                                            │
│ arch.txt   │   nodes + edges + minimap + controls       │
│ ─────────  │                                            │
│ VISIBLE    │                                            │
│ ☑ Concepts │                                            │
│ ☑ Arguments│                                            │
│ ☑ Questions│                                            │
│ ─────────  │                                            │
│ Source     │                                            │
│ fixture... │                                            │
├────────────┴────────────────────────────────────────────┤
│ Selected: node  | Type: concept  |  Doc: sampleText.txt │ ← info bar, 32px
│ [Layered Summary] [Concept Glossary] [Args] [Questions] │ ← tab bar, active=blue-500 underline
│ ────────────────────────────────────────────────────────│
│ markdown-rendered content...                            │ ← 180px default, scrollable
└─────────────────────────────────────────────────────────┘
```

**Header (48px)**: Logo left (Fira Code bold, 14px), search input center (280px, zinc-800 bg, ⌘K hint), source badge right. No extra chrome.

**Sidebar (220px)**: Zinc-900 background. Three sections: Documents list (active doc highlighted in zinc-800), Facet toggles (checkbox + color dot per facet), Source footer (monospace path at bottom). All separated by zinc-700 borders.

**Graph canvas**: Fills remaining space. Zinc-950 background with dot grid. xyflow nodes + edges. Minimap bottom-right. Controls (zoom +/-/fit) bottom-right above minimap.

**Detail panel (180px default)**: Info bar (32px) showing Selected node / Type / Document. Tab bar (4 tabs: Layered Summary, Concept Glossary, Argument Map, Comprehension Check) with blue-500 active underline. Content area with markdown-rendered HTML.

## Section 4: Graph Canvas Behavior

**Library**: @xyflow/react v12 + @dagrejs/dagre. Custom xyflow node types for the 4 facet types.

### Layout
- Dagre LR (left-to-right), `rankdir: LR`, nodesep 80, ranksep 140
- Default fitView on load. Manual zoom 0.3x–2x range. Controls widget (zoom +/-/fit) bottom-right corner

### Node Interaction
- **Click**: Selects node — blue-500 2px ring + subtle glow. Sidebar document click also triggers graph selection. Populates detail panel info bar (Selected/Type/Document)
- **Selected state**: 2px blue-500 border, box-shadow glow (#3B82F6 at 20% opacity)

### Search
- Matching nodes get indigo glow (matching facet color at increased opacity)
- Non-matching nodes dim to 40% opacity
- Search triggered from header search input with real-time filtering

### Edges
- `defines` / `supports` → solid (#6366F1 indigo)
- `depends_on` / `exemplifies` → dashed (#6366F1 indigo)
- `contradicts` → dashed (#EF4444 red)
- `contains` → solid (#3F3F46 zinc)
- `questions` → dashed (#10B981 emerald)
- Animated on: defines, depends_on, contradicts

### MiniMap
- Bottom-right corner, 120x70px default
- Node colors match facet: indigo=concept, emerald=question, amber=argument, zinc=document
- Background zinc-900, mask rgba(9,9,11,0.08)

### Facet Filtering
- Toggle off → hide those node types + their connected edges
- Graph re-applies dagre layout on filter change (re-layout with remaining nodes)

### Empty State
- Centered in graph area: "No graph data" with ⊘ icon
- Subtle secondary text: "Run /comprehend to generate"
- Dot grid still visible at reduced opacity

### Background
- Dot grid pattern: 1px dots at #27272A on #09090B background, 20px spacing
- Uses xyflow Background component with `color="#27272A" gap={20}`

## Section 5: Detail Panel & Tabs

### Info Bar (32px)
- Fixed top bar showing: **Selected** (node label), **Type** (facet kind), **Document** (title)
- Pipe-separated, zinc-400 labels, zinc-50 values in bold
- When `selection` is null: shows "Selected: none"

### Tab Bar
- 4 tabs: Layered Summary, Concept Glossary, Argument Map, Comprehension Check
- Fira Code 12px labels
- Active tab: blue-500 text, 600 weight, 2px blue-500 bottom border
- Inactive tab: zinc-500 text, border-transparent
- `<button>` elements with `role="tab"`, `aria-selected`, keyboard nav (ArrowLeft/Right/Home/End)
- Tabs reset to Layered Summary on document change (`useEffect` on `document.id`)

### Content Area
- **3 markdown tabs** (summary, glossary, arguments): `renderMarkdown()` output via `dangerouslySetInnerHTML`
  - Fira Sans 14px, line-height 1.7, zinc-400 color
  - `h3`: 16px bold zinc-50. `h4`: 14px semibold zinc-50
  - `<code>`: Fira Code 12px, zinc-800 bg, 4px radius
  - `<strong>`: zinc-200 weight
  - Scrollable (overflow-y: auto)

- **Questions tab**: `<ComprehensionCheck>` component
  - Summary bar: question count | difficulty breakdown | revealed count | Show All/Hide All button
  - Question cards: difficulty badge (basic=emerald, intermediate=amber, advanced=red), numbered question text
  - Revealed answers: green-tinted callout box (#22C55E at 8% opacity), 2px green top border (matching node accent pattern, no side-stripe)
  - Toggle buttons: "Show Answer" (blue-500), "Hide Answer" (zinc-800)

### Empty State
- Centered icon + "Select a document from the sidebar to view its details."
- zinc-500 text, zinc-950 background area

### Degraded State
- Red-tinted banner (#EF4444 at 8% opacity): "Document detail unavailable"
- Shows path + error message in Fira Code
- Below: "Re-run /comprehend --retry-failed to attempt recovery"

## Section 6: State Management (Zustand)

Replaces 10+ `useState` calls in `App.tsx` with a single Zustand store.

### Store (`packages/dashboard/src/store/dashboard-store.ts`)

```typescript
interface DashboardStore {
  source: DashboardSource;
  data: DashboardData;
  lastReadyData: ReadyDashboardData | null;
  refreshToken: number;
  refreshWarning: string | null;

  searchQuery: string;
  facets: GraphFacetState;
  selectedNodeId: string | null;
  graphViewState: GraphViewState;

  setSearchQuery: (q: string) => void;
  toggleFacet: (facet: keyof GraphFacetState) => void;
  selectNode: (id: string | null) => void;
  selectDocument: (id: string) => void;
  refresh: () => void;
  setData: (data: DashboardData) => void;
}
```

### Key decisions
- **App.tsx → thin orchestrator**: init store, pass source, render `<DashboardShell />`
- **No prop drilling**: DashboardShell reads from store via `useDashboardStore()` hook
- **graph-view-model remains pure**: `buildGraphViewModel()` called as a selector outside the store, not mutated inside it
- **Computed values** (graph, selectedDocument, detailSelection) derived in DashboardShell, not stored

## Section 7: Component Tree & File Structure

```
packages/dashboard/src/
├── main.tsx                    ← MODIFY: Tailwind CSS import
├── index.css                   ← NEW: @import "tailwindcss" + dark theme tokens
├── App.tsx                     ← REWRITE: thin orchestrator, init store
├── store/
│   └── dashboard-store.ts      ← NEW: Zustand store (Section 6)
├── data/
│   ├── types.ts                ← PRESERVE
│   ├── load-dashboard-data.ts  ← PRESERVE
│   └── ...                     ← PRESERVE
├── features/
│   ├── graph-view-model.ts     ← PRESERVE
│   ├── markdown-renderer.ts    ← PRESERVE
│   ├── dashboard-shell.tsx     ← REWRITE: Tailwind layout, store hooks
│   ├── graph-canvas.tsx        ← REWRITE: Tailwind, fix selection sync
│   ├── graph-nodes/
│   │   ├── DocumentNode.tsx    ← REWRITE: Tailwind dark theme
│   │   ├── ConceptNode.tsx     ← REWRITE
│   │   ├── ArgumentNode.tsx    ← REWRITE
│   │   └── QuestionNode.tsx    ← REWRITE
│   ├── detail-panel-shell.tsx  ← REWRITE: Tailwind tabs + markdown
│   ├── comprehension-check.tsx ← REWRITE: Tailwind cards
│   ├── search-controls.tsx     ← REWRITE: Tailwind input
│   ├── facet-toggle-group.tsx  ← REWRITE: Tailwind checkboxes
│   └── source-status-badge.tsx ← REWRITE: Tailwind badge
└── index.html                  ← PRESERVE (fonts already added in Task 1)

DELETE: All *.module.css files (14 files)
DELETE: packages/dashboard/src/styles/ (tokens.css, reset.css)
```

### Dependencies (already installed)
- @xyflow/react ^12.x, @dagrejs/dagre ^3.x, react ^19, vite ^7
- ADD: zustand, tailwindcss ^4.x, @tailwindcss/vite

### Test files
- All `*.test.*` files rewritten to match new component DOM and Tailwind classes
