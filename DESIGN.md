---
version: "1.0.0"
name: "Text Comprehend Dashboard"
description: "Dark interactive knowledge-graph explorer for text document analysis"
mode: "dark"
---
# Text Comprehend Dashboard

## Color Palette

### Surfaces (zinc scale)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-canvas` | `#09090B` | Graph canvas, page background |
| `--bg-surface` | `#18181B` | Sidebar, panels, cards |
| `--bg-raised` | `#27272A` | Hover states, active items, badges |
| `--border` | `#3F3F46` | All borders, separators |

### Text (zinc scale)

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#FAFAFA` | Headings, body text, labels |
| `--text-secondary` | `#A1A1AA` | Secondary labels, metadata |
| `--text-muted` | `#71717A` | Placeholders, disabled text |

### Accents

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-primary` | `#3B82F6` | Buttons, selection, focus rings |
| `--accent-success` | `#22C55E` | Answer callouts, positive states |
| `--accent-warning` | `#F59E0B` | Argument facet, warnings |
| `--accent-danger` | `#EF4444` | Errors, contradicts edges |

### Graph Facet Colors

| Token | Value | Facet |
|-------|-------|-------|
| `--facet-document` | `#A1A1AA` | Document nodes |
| `--facet-concept` | `#6366F1` | Concept nodes |
| `--facet-argument` | `#F59E0B` | Argument nodes |
| `--facet-question` | `#10B981` | Question nodes |

## Typography

### Fonts

| Role | Family | Weights |
|------|--------|---------|
| Body / UI | Fira Sans | 300, 400, 500, 600, 700 |
| Code / Labels | Fira Code | 400, 500, 600, 700 |

### Scale (fixed rem, no fluid clamp)

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 12px | Badges, metadata, footer |
| `--text-sm` | 13px | Sidebar labels, tabs, node type |
| `--text-base` | 14px | Body text, detail panel prose |
| `--text-lg` | 16px | Section headings, emphasis |
| `--text-xl` | 18px | Modal titles |
| `--text-2xl` | 20px | Page headings |
| `--text-3xl` | 24px | Hero / header logo |

### Line Heights

- Prose (detail panel): 1.7
- UI elements: 1.4

## Spacing Scale

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 12px |
| `--space-lg` | 16px |
| `--space-xl` | 24px |
| `--space-2xl` | 32px |

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Tags, small buttons |
| `--radius-md` | 6px | Cards, nodes, inputs |
| `--radius-lg` | 8px | Panels, dialogs |

## Components

### Header
- 48px height, zinc-950 background, bottom border zinc-700
- Logo: Fira Code 14px bold, left-aligned
- Search: centered, 280px width, zinc-800 background, ⌘K shortcut hint
- Source badge: right-aligned, zinc-900 chip

### Sidebar
- 220px width, zinc-900 background, right border zinc-700
- Document list: vertical list, active item highlighted zinc-800
- Facet toggles: checkbox + 7px colored dot per facet type
- Source footer: pinned to bottom, monospace path

### Graph Canvas
- Fills remaining viewport, zinc-950 background
- Dot grid: 1px zinc-800 dots, 20px spacing
- xyflow ReactFlow with dagre LR layout
- Nodes: 1px zinc-700 border, 2px top facet accent, 7px colored dot
- Minimap bottom-right, controls bottom-right above minimap

### Detail Panel
- 180px default height, collapsible
- Info bar: 32px, pipe-separated Selected / Type / Document
- Tab bar: 4 tabs (Fira Code 12px), active = blue-500 underline
- Content: markdown-rendered HTML or ComprehensionCheck component

### States
- Loading: skeleton placeholders, not spinners
- Empty: centered message with icon ("No graph data", "Select a document")
- Error: red-tinted banner with path + message, retry prompt
- Degraded: red banner + recovery instructions

## Motion

- Transition duration: 150-300ms
- Easing: ease-out
- Animated properties: color, background, border-color, opacity, transform
- No layout-property animations (no height/width transitions)
- `prefers-reduced-motion: reduce` → instant transitions
- xyflow edge animation: defines, depends_on, contradicts edges only
