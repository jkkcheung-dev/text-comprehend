# Text Comprehend - Design Specification

**Date:** 2026-03-29
**Status:** Approved (pending final review)

## Overview

Text Comprehend is an AI agent plugin designed for OpenCode first, with Claude Code support following once the workflow is proven. It deeply analyzes text documents in a working directory, extracts structured comprehension data using parallel specialist agents, and provides an interactive mind-map dashboard for exploring the results.

**Core problems solved:** comprehension depth (help people actually grasp what they read) and retention/synthesis (help people remember and connect ideas).

**Input:** Text files in the working directory (.md, .txt, .pdf, .rst, .html, .docx).
**Output:** Structured JSON knowledge graph + human-readable markdown summaries + an interactive single-page mind-map UI.

## Landscape Context

The open-source space has mature tooling for document Q&A/RAG (RAGFlow 76k stars, ai-pdf-chatbot-langchain 16k) and classical text summarization (sumy, textrank), but significant gaps exist in:

- Adaptive text simplification for comprehension
- Argument structure extraction (claims, evidence, logical gaps)
- Integrated multi-faceted reading tools
- Progressive disclosure / layered reading
- Text-to-mind-map with interactive drill-down

Text Comprehend fills these gaps by combining hierarchical summarization, concept extraction, argument mapping, and comprehension Q&A into a single tool with an interactive visual interface.

## Architecture

### Approach: Parallel Specialist Agents

Multiple specialist agents run in parallel on each document, each extracting a different comprehension facet. A graph builder merges all outputs into a unified knowledge graph. This approach was chosen because:

1. Multi-faceted views map naturally to independent agents
2. Adding new views later is just adding a new agent
3. Parallel execution is faster for large document sets
4. Agent independence means one failure doesn't block others

### Plugin Structure

```
text-comprehend/
  .claude-plugin/         # Claude Code plugin manifest
  .opencode/              # OpenCode plugin config + install instructions
  agents/                 # Specialized AI agent definitions
  skills/                 # Slash command skill files
  src/                    # TypeScript source code
  packages/
    core/                 # Analysis engine (types, schemas, persistence, search)
    dashboard/            # React single-page mind map UI
  scripts/                # Build/utility scripts
  docs/                   # Documentation
  tests/
    fixtures/             # Sample test corpus
```

### Slash Commands

| Command | Purpose |
|---|---|
| `/comprehend` | Scan and analyze all text files in the working directory |
| `/comprehend-chat` | Ask questions about the analyzed documents |
| `/comprehend-explore` | Launch the interactive mind map dashboard |
| `/comprehend-summary <file>` | Quick summary of a specific file |

### Output Directory

`.text-comprehend/` in the working directory:
- `manifest.json` -- file hashes and analysis metadata for incremental updates
- `knowledge-graph.json` -- unified graph data
- `facets/summaries/<doc-id>.json` -- hierarchical summaries per document
- `facets/concepts/<doc-id>.json` -- concept extractions per document
- `facets/arguments/<doc-id>.json` -- argument mappings per document
- `facets/qa/<doc-id>.json` -- Q&A pairs per document
- `simplified/<doc-id>/layered-summary.md` -- 3-level summary
- `simplified/<doc-id>/concept-glossary.md` -- concepts with definitions
- `simplified/<doc-id>/argument-map.md` -- claims + evidence in outline form
- `simplified/<doc-id>/comprehension-check.md` -- Q&A pairs for self-testing

## Multi-Agent Pipeline

### Phase 1: Discovery

**`document-scanner`** scans the working directory for supported text files. Detects file types, estimates size, skips binary files and anything in `.gitignore`. Produces a manifest of documents to process.

### Phase 2: Analysis (Parallel Specialists)

For each document, four agents run in parallel. Documents are batched (up to 5 documents at a time), and within each batch, all 4 facet agents for all documents run concurrently (up to 20 parallel agent calls per batch):

| Agent | Output File | Extracts |
|---|---|---|
| `summarizer` | `facets/summaries/<doc-id>.json` | 3-level hierarchical summary: one-line thesis, paragraph overview, section-by-section breakdown with key points |
| `concept-extractor` | `facets/concepts/<doc-id>.json` | Key concepts/entities, definitions, relationships between concepts |
| `argument-mapper` | `facets/arguments/<doc-id>.json` | Main claims, supporting evidence, logical structure, identified gaps/assumptions |
| `qa-generator` | `facets/qa/<doc-id>.json` | Comprehension questions at different difficulty levels with answers and source references |

### Phase 3: Merge

**`graph-builder`** takes all facet outputs and merges them into `knowledge-graph.json`. Each document becomes a top-level node. Concepts, arguments, and Q&A pairs become child/related nodes. Edges represent relationships.

### Phase 4: Validation (optional, `--review` flag)

**`graph-reviewer`** validates graph completeness, checks for orphaned nodes, verifies source references point to real text, flags low-confidence extractions.

### Incremental Updates

On subsequent runs, only re-analyzes files that changed since last run by comparing file hashes stored in `manifest.json`.

## Data Model

### Knowledge Graph Schema

```typescript
interface KnowledgeGraph {
  version: string;              // Schema version (e.g., "1.0.0")
  generatedAt: string;          // ISO timestamp
  documents: DocumentNode[];
  edges: Edge[];
}

interface DocumentNode {
  id: string;                   // SHA-256 hash of relative file path (first 12 hex chars)
  filePath: string;             // Relative path to source file
  title: string;                // Extracted or inferred title
  fileType: string;             // md, txt, pdf, etc.
  lastAnalyzed: string;         // ISO timestamp
  fileHash: string;             // For incremental update detection
  summary: HierarchicalSummary;
  concepts: ConceptNode[];
  arguments: ArgumentNode[];
  questions: QuestionNode[];
}

interface HierarchicalSummary {
  thesis: string;               // One-line core message
  overview: string;             // Paragraph-level summary
  sections: SectionSummary[];
}

interface SectionSummary {
  id: string;
  heading: string;
  summary: string;
  keyPoints: string[];
  sourceRange: SourceRef;
}

interface ConceptNode {
  id: string;
  name: string;
  definition: string;
  importance: "core" | "supporting" | "peripheral";
  sourceRefs: SourceRef[];
}

interface ArgumentNode {
  id: string;
  claim: string;
  type: "main" | "supporting" | "counter";
  evidence: Evidence[];
  assumptions: string[];
  gaps: string[];
  sourceRefs: SourceRef[];
}

interface Evidence {
  content: string;
  type: "data" | "citation" | "reasoning" | "example" | "authority";
  strength: "strong" | "moderate" | "weak";
  sourceRef: SourceRef;
}

interface QuestionNode {
  id: string;
  question: string;
  answer: string;
  difficulty: "basic" | "intermediate" | "advanced";
  facet: "factual" | "inferential" | "evaluative";
  sourceRefs: SourceRef[];
}

interface Edge {
  source: string;
  target: string;
  type: "contains" | "supports" | "contradicts" | "defines"
      | "depends_on" | "exemplifies" | "questions";
  label?: string;
  weight?: number;              // 0-1
}

interface SourceRef {
  documentId: string;
  startLine: number;
  endLine: number;
  excerpt: string;
}
```

## Interactive Mind Map Dashboard

### Tech Stack

- React 19 + TypeScript + Vite
- React Flow for interactive graph rendering
- Dagre for automatic graph layout
- TailwindCSS v4 for styling
- Zustand for state management

### How It Launches

The `/comprehend-explore` command:

1. Builds the dashboard (if not already built)
2. Copies `knowledge-graph.json` + `simplified/` files into the dashboard's public directory
3. Opens a local dev server (e.g., `http://localhost:5173`)
4. The React app loads the JSON and renders the graph

### UI Layout

```
+------------------------------------------------------------------+
|  [Text Comprehend]         [Search...]     [Facet: All v]        |
+------------------+-----------------------------------------------+
|                  |                                                |
|  Document List   |          Interactive Mind Map                  |
|  ____________    |                                                |
| | doc-1.md  |   |    [Thesis] ---- [Concept A] --- [Concept B]  |
| | doc-2.txt |   |       |               |                        |
| | doc-3.pdf |   |    [Argument 1]   [Definition]                 |
| |___________|   |       |                                        |
|                  |    [Evidence]                                  |
|  Facet Toggles   |       |                                        |
|  [x] Summaries   |    [Q: What is...?]                           |
|  [x] Concepts    |                                                |
|  [x] Arguments   |                                                |
|  [x] Q&A         |                                                |
|                  |                                                |
+------------------+-----------------------------------------------+
|  Detail Panel (expands when node is clicked)                     |
|  Shows: full content, source reference, related nodes            |
+------------------------------------------------------------------+
```

### Key Interactions

**Level navigation:** Click a node to expand its children (drill down). Click background or breadcrumb to go back up. The thesis is the top level; sections, concepts, arguments, and Q&A are progressively deeper.

**Facet toggles:** Sidebar checkboxes filter which node types are visible. Uncheck "Q&A" to hide all question nodes. Grayed out if that facet's data is missing for the selected document.

**Detail panel:** Clicking any node opens a bottom/side panel showing full content (rendered markdown), source reference (excerpt with line numbers), and related nodes.

**Search:** Fuzzy search across all node labels, content, and definitions. Highlights matching nodes on the graph.

**Node color coding:**
- Documents: neutral gray
- Summaries/sections: blue
- Concepts: green
- Arguments/claims: orange
- Evidence: yellow
- Questions: purple

**Zoom levels:**
- Level 0: Document overview (just document title nodes)
- Level 1: Thesis + top concepts per document
- Level 2: Full section summaries + argument claims
- Level 3: All detail nodes (evidence, definitions, Q&A)

## Error Handling

### File Processing
- Unsupported file types: scanner logs warning, skips file
- Empty files: skipped with note in manifest
- Very large files (>100KB text): chunked into sections, agents process chunks, graph-builder reassembles
- Binary/corrupted files: detected by scanner, skipped
- PDF extraction failures: fall back to simpler text extraction, log warning

### Agent Failures
- Each agent run is independent; if one fails on a document, the other three facets still produce output
- Failed facets recorded in manifest with error details
- `/comprehend --retry-failed` retries only failed analyses

### Dashboard Resilience
- Missing facet data: UI hides that facet's nodes (toggle grayed out)
- Malformed JSON: error banner shown, rest of graph still loads

### Incremental Update Edge Cases
- File renamed: treated as delete + new file (hash changes)
- File deleted: removed from graph on next run
- Manifest corruption: full re-analysis triggered automatically

## Testing Strategy

### Test Framework
Vitest for all TypeScript tests. Sample test corpus in `tests/fixtures/`.

### Unit Tests (core package)
- Schema validation: generated JSON conforms to TypeScript interfaces via Zod schemas
- File scanner: file type detection, gitignore respect, hash computation
- Graph builder: merging facet outputs, edge deduplication, orphan detection
- Incremental updates: hash comparison, partial re-analysis, manifest persistence

### Integration Tests
- Agent prompt testing: feed known documents to each agent, validate output structure
- Pipeline end-to-end: run `/comprehend` on test corpus (3-5 sample documents), verify knowledge-graph.json is valid and complete

### Dashboard Tests
- Component tests: React Testing Library for graph rendering, facet toggles, search, detail panel
- Data loading: graceful handling of missing/malformed JSON files

## Target Platforms

- OpenCode (plugin config + install instructions)
- Claude Code (native plugin), later release after solution working on OpenCode
- Additional platforms (Codex, Gemini CLI, Cursor) deferred to later releases

## Future Considerations (Not in Scope for V1)

- Cross-document synthesis (shared concepts, contradictions across documents)
- Reading speed enhancement (bionic reading, RSVP)
- Spaced repetition integration for retention
- Collaborative annotations
- Non-English language support
- Export to Anki/Obsidian/Notion
