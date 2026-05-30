# AGENTS.md

## Project Shape
- This repo is a TypeScript npm workspace. Root `src/` is mostly command/platform glue; `packages/core/src/` holds the real scan/analyze/render pipeline; `packages/dashboard/src/` is the React/Vite viewer.
- OpenCode loads `.opencode/plugins/text-comprehend.ts`, which just re-exports `src/platforms/opencode/plugin.ts`. If a slash command changes behavior, trace from the OpenCode hook into root `src/` and then into `packages/core`.

## Source Of Truth
- Treat repository-backed code as the source of truth, not the slash-command markdown. `.opencode/commands/*.md` explicitly says to use plugin/runtime output, and `src/commands/create-command-prompt.ts` routes command prompts through `npx tsx scripts/command-bridge.ts ...`.
- `scripts/command-bridge.ts` only builds the prompt that tells an agent to use the repository-backed command path. Actual command behavior lives in `src/commands/execute-direct-command.ts` plus `packages/core/src/commands/workflows.ts`.

## Key Entry Points
- Full analysis: `packages/core/src/pipeline/pipeline.ts` via `runComprehendWorkflow()`.
- OpenCode command interception: `src/platforms/opencode/command-hook.ts`.
- Dashboard launch/build/runtime orchestration: `src/dashboard/launch-dashboard.ts`.
- Dashboard browser app entry: `packages/dashboard/src/main.tsx`.

## Artifact Contract
- Generated artifacts live under `.text-comprehend/`. Core files are `knowledge-graph.json`, `manifest.json`, facet outputs, and `simplified/<documentId>/` markdown.
- The scanner always skips `.git`, `.text-comprehend`, and `node_modules`, and also respects nested `.gitignore` files. Do not expect generated artifacts to be rescanned as inputs.
- `/comprehend-summary <file>` is not list-only: if the file exists and is a supported text file, `resolveSummaryWorkflow()` runs single-file analysis on demand and then reads the new artifact.

## Pipeline Quirks
- Incremental behavior is manifest-driven. `runPipeline()` only reprocesses changed files unless `--retry-failed` is set, and it prunes removed-file artifacts from `.text-comprehend/`.
- Review mode is optional. `/comprehend --review` runs graph review and reports findings; `--review-strict` also turns review errors into pipeline errors.
- Large files over ~100 KB are chunked in `packages/core/src/pipeline/pipeline.ts`; merged facet output is re-persisted after chunk processing. Be careful editing chunk ID or source-line logic.
- Binary document extensions are recognized but currently skipped as unsupported extraction targets.

## Dashboard Notes
- `packages/dashboard/vite.config.ts` adds custom middleware for fixture reads, workspace reads, and a health endpoint. The workspace file-serving path is intentionally locked down to `.text-comprehend/` and checks realpaths to block escapes.
- Workspace dashboard mode is query-string driven: `?source=workspace&workspaceRoot=...`. `packages/dashboard/src/resolve-dashboard-source.ts` falls back to the `dashboard-workspace` fixture when the query is absent.
- `src/dashboard/launch-dashboard.ts` expects analyzed output first. If `.text-comprehend/knowledge-graph.json` is missing, the correct behavior is to tell the user to run `/comprehend`.

## Commands
- Root verification commands:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- `npm run build` builds `@text-comprehend/core` first, then `@text-comprehend/dashboard`.
- `npm run typecheck` is broader than it looks: it checks root code, both workspaces, and `.opencode/tsconfig.json`.
- Dashboard-only work:
  - `npm run dev --workspace @text-comprehend/dashboard`
  - `npm run test --workspace @text-comprehend/dashboard`

## Testing Boundaries
- Vitest includes tests from root `src/**/*.test.*`, `packages/*/src/**/*.test.*`, and `tests/**/*.test.*`.
- Use `tests/fixtures/` for realistic sample corpus and dashboard artifact fixtures instead of inventing new ad hoc data when an existing fixture already covers the shape.

## Suggested Reading Order
- `package.json`
- `src/platforms/opencode/plugin.ts`
- `src/platforms/opencode/command-hook.ts`
- `src/commands/execute-direct-command.ts`
- `packages/core/src/commands/workflows.ts`
- `packages/core/src/pipeline/pipeline.ts`
- `src/dashboard/launch-dashboard.ts`
- `packages/dashboard/src/data/load-dashboard-data.ts`

## Scope Notes
- Ignore `docs/study/` and `.superpowers/` unless the task is explicitly about those directories.

## Critical Convention on doing tasks
- Must try to find any available skills before starting any task, choose the most suitable skill to do the task, if got any doubts, ask me to confirm.