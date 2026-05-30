# Understand-Anything Study Notes

**Repository:** `https://github.com/Lum1104/Understand-Anything`
**Purpose of this note:** Explain the repo in a reader-friendly way so you can quickly understand how the system is structured and what happens when someone uses it.

## What It Is

Understand-Anything is a local-first code understanding system built around AI-agent workflows and a generated knowledge graph.

It is not a typical hosted web app with a persistent backend and database. Instead, it works more like this:

1. Analyze a codebase or knowledge source.
2. Convert that analysis into graph-shaped JSON artifacts.
3. Use those artifacts to power a local dashboard and other AI-assisted commands.

The result is a tool that helps users explore a repository through graph visualization, search, code explanation, onboarding flows, and diff impact analysis.

## The Big Idea

The repo separates the system into three practical layers:

1. Analysis layer
   - Scans files, parses code, runs AI-oriented analysis, and assembles a knowledge graph.
2. Plugin and command layer
   - Exposes workflows such as `/understand`, `/understand-chat`, and `/understand-dashboard`.
3. Dashboard layer
   - Reads the generated graph files and renders an interactive UI for exploration.

This design keeps the expensive understanding step separate from the visualization step. The graph becomes the shared contract between the system's features.

## Main Parts of the Repo

### `understand-anything-plugin/`

This is the heart of the project. It contains:

- skill-driven command workflows
- agent prompt definitions
- orchestration logic for understanding and explanation features
- the monorepo packages for core analysis and dashboard rendering

Important subareas include:

- `skills/`
  - Defines the user-facing commands and their workflows.
- `agents/`
  - Contains the specialist agent prompts used during analysis.
- `src/`
  - Contains supporting logic such as context building, explanation helpers, and diff analysis.

### `understand-anything-plugin/packages/core/`

This is the analysis and data-model layer.

It includes responsibilities such as:

- graph construction
- persistence to disk
- search utilities
- parser/analyzer utilities
- tree-sitter based code understanding support

This package is where the repo's reusable understanding logic lives.

### `understand-anything-plugin/packages/dashboard/`

This is the local UI layer.

It is a React + Vite dashboard that loads graph JSON files and visualizes them. It appears to provide:

- graph exploration
- client-side search
- local dashboard state management
- visual overlays such as domain and diff views

### `homepage/`

This is the marketing or demo website, not the main runtime product.

It is useful for documentation and presentation, but not the primary system to study if you want to understand how the tool actually works.

## How the System Works End to End

The main flow starts with the `/understand` command.

### Step 1: The user runs `/understand`

The workflow is defined in `understand-anything-plugin/skills/understand/SKILL.md`.

At a high level, this command is responsible for understanding a repository and producing the graph artifacts that the rest of the system uses.

### Step 2: The project is scanned and analyzed

The system appears to use a mix of deterministic and AI-driven analysis.

Deterministic analysis includes things like:

- parsing source code with `web-tree-sitter`
- collecting file structure and syntax-level information
- using core graph-building logic to normalize outputs

AI-driven analysis includes agent-based tasks such as:

- project scanning
- file analysis
- architecture analysis
- tour generation
- graph review

Relevant agent prompt files include:

- `agents/project-scanner.md`
- `agents/file-analyzer.md`
- `agents/architecture-analyzer.md`
- `agents/tour-builder.md`
- `agents/graph-reviewer.md`

### Step 3: Results are merged into a knowledge graph

The graph is the central artifact of the system.

The repo suggests that many separate outputs are merged into a single model that represents:

- files and code structures
- architectural relationships
- derived tours or explanations
- searchable graph nodes and edges

The most important implementation area for this appears to be:

- `understand-anything-plugin/packages/core/src/analyzer/graph-builder.ts`

### Step 4: Graph artifacts are written to disk

Instead of storing analysis in a remote service, the repo writes generated data into a local directory:

- `.understand-anything/knowledge-graph.json`
- `.understand-anything/meta.json`
- `.understand-anything/fingerprints.json`
- sometimes related files such as `domain-graph.json` and `diff-overlay.json`

Persistence helpers appear in:

- `understand-anything-plugin/packages/core/src/persistence/index.ts`

### Step 5: The user runs `/understand-dashboard`

This command launches the local dashboard for exploring the generated graph.

The dashboard is not backed by a remote API server. Instead, it relies on a local Vite-based server layer that reads JSON from `.understand-anything/` and exposes it to the React frontend.

### Step 6: The dashboard loads graph files and renders them

The key files here are:

- `understand-anything-plugin/packages/dashboard/src/App.tsx`
- `understand-anything-plugin/packages/dashboard/src/store.ts`
- `understand-anything-plugin/packages/dashboard/vite.config.ts`

The frontend fetches local graph data such as:

- `/knowledge-graph.json`
- `/domain-graph.json`
- `/diff-overlay.json`
- `/meta.json`

Then it renders the exploration UI in the browser.

## The Dashboard Runtime Model

One of the most important details in this repo is that there is no traditional backend application.

The effective runtime model is:

1. React dashboard in the browser
2. local Vite middleware as a thin protected file server
3. JSON graph files on disk under `.understand-anything/`

This matters because it explains a lot of the repo structure:

- there is no normal API service folder
- there is no database schema
- the graph files are the source of truth after analysis completes
- UI features are mostly driven by local file-backed data

The Vite config reportedly also handles practical concerns such as:

- generating a one-time access token
- serving local files through protected endpoints
- sanitizing file paths before returning data to the browser

## What the Other Commands Do

Once the graph exists, other commands reuse it.

### `/understand-chat`

Builds graph-aware context for asking questions about the repository.

### `/understand-explain`

Uses graph-derived context to explain files, features, or architecture.

### `/understand-diff`

Maps changed files onto the graph and estimates impacted neighboring nodes.

### `/understand-onboard`

Helps someone get oriented in the codebase using graph-aware onboarding context.

### `/understand-domain`

Generates a domain-focused view or graph derived from the main knowledge graph.

### `/understand-knowledge <wiki-path>`

Applies a similar idea to a knowledge base or wiki-style content rather than only source code.

## Main Data Flow

The easiest way to think about the data flow is this:

1. Repository files are scanned.
2. Deterministic parsing and AI agents analyze the codebase.
3. Outputs are merged into a structured graph.
4. The graph is saved into `.understand-anything/`.
5. The dashboard and graph-aware commands consume those files.

That means the graph is the system's shared internal contract.

If you understand the graph generation path, you understand the core of the repo.

## Tech Stack

The main technologies appear to be:

- `pnpm` workspace monorepo
- TypeScript
- Node.js ESM
- `web-tree-sitter` and multiple tree-sitter language grammars
- React 19
- Vite
- Tailwind CSS 4
- Zustand
- `@xyflow/react`, `@dagrejs/dagre`, `d3-force`
- Vitest
- Astro for the homepage

This is a practical stack for a local developer tool: TypeScript for orchestration, parser tooling for structural analysis, and a modern React dashboard for interactive exploration.

## Setup and Operating Model

The repo is designed to integrate with multiple AI coding environments rather than only one host.

Examples mentioned in the repo summary include:

- Claude Code
- Copilot CLI
- Cursor
- Codex
- OpenCode
- Gemini CLI

Important operational details:

- normal usage does not require a hosted backend
- no app-specific database is required
- no major `.env` setup appears to be necessary for normal local use
- the host AI platform provides the AI execution environment

For contributors, the important local requirements appear to be:

- Node.js 22+
- pnpm 10+

Typical commands include:

- `pnpm install`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm dev:dashboard`

## Best Mental Model

If you want one sentence to remember this repo by, use this:

Understand-Anything is a local analysis pipeline that turns a codebase into graph artifacts, then uses those artifacts to power exploration, explanation, onboarding, and diff-aware tooling.

That mental model is more accurate than thinking of it as a normal app with a backend.

## Best Files To Read First

If you want to study the repo efficiently, read these first:

1. `understand-anything-plugin/skills/understand/SKILL.md`
2. `understand-anything-plugin/packages/dashboard/src/App.tsx`
3. `understand-anything-plugin/packages/dashboard/vite.config.ts`
4. `understand-anything-plugin/packages/dashboard/src/store.ts`
5. `understand-anything-plugin/packages/core/src/analyzer/graph-builder.ts`
6. `understand-anything-plugin/packages/core/src/persistence/index.ts`
7. `understand-anything-plugin/src/context-builder.ts`

## Suggested Reading Order

Use this order if you want to understand the repo with minimal backtracking:

1. Read the `/understand` skill to see the top-level workflow.
2. Read the core graph builder and persistence code to see what gets generated.
3. Read the dashboard Vite config to understand how data is served locally.
4. Read the dashboard app and store to see how the UI consumes the graph.
5. Read supporting command/context files such as diff analysis or explain builders.

## Short Summary

The repo works by generating a local knowledge graph from a codebase, storing that graph on disk, and then using it as the foundation for a dashboard and several AI-assisted workflows.

If you study only one concept, study the graph lifecycle:

`scan -> analyze -> merge -> persist -> render -> reuse`
