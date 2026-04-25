# Priority 5 Repo Alignment Design

## Goal

Align the repository incrementally toward the spec-defined structure by making root `src/` the canonical home for repo-level command surfaces first, while deferring `.claude-plugin/` support until after that structure exists.

## Scope

This design covers only the first Priority 5 increment.

- In scope: establish a real root `src/` layer for command and platform entrypoints.
- In scope: keep `packages/core` as the analysis engine during this increment.
- In scope: preserve current command behavior while moving architectural ownership upward.
- Out of scope: broad internal migration out of `packages/core`.
- Out of scope: implementing `packages/dashboard/`.
- Out of scope: adding `.claude-plugin/` support in this increment.

## Current Context

The current repository is centered on `packages/core`, `.opencode/`, and scripts. The existing design spec still describes a higher-level repo layout with:

- `.claude-plugin/`
- `agents/`
- `skills/`
- `src/`
- `packages/core/`
- `packages/dashboard/`

That mismatch is now most visible at the command surface:

- `.opencode/plugins/text-comprehend.ts` imports directly from `packages/core/src/commands/opencode-plugin.ts`
- `scripts/command-bridge.ts` imports `createCommandPrompt` through `packages/core/src/index.ts`
- `packages/core/src/commands/` currently mixes repo-level command orchestration with lower-level workflow functions

## Approaches Considered

### 1. Wrapper-first

Create root `src/` files that mainly re-export or delegate to the existing `packages/core/src/commands/*` modules.

- Pros: smallest code churn
- Cons: makes `src/` mostly cosmetic and does not materially reduce the spec mismatch

### 2. Orchestration lift

Move repo-level command orchestration into root `src/` while leaving analysis internals in `packages/core`.

- Pros: gives `src/` real ownership immediately, matches the spec direction, keeps risky internals stable
- Cons: requires careful boundary definition to avoid duplicate command logic

### 3. Package facade

Introduce root `src/` and enforce a stricter facade where repo-level code imports only curated public exports from `packages/core`.

- Pros: clean long-term layering
- Cons: too much export and packaging cleanup for this first increment

## Decision

Use the orchestration-lift approach.

For this first increment, root `src/` becomes the canonical repo-level command surface. `packages/core` remains the lower-level implementation engine for pipeline, graph, schemas, manifest, scanner, renderer, and related reusable workflow logic.

## Architecture

Target boundary for the first increment:

- Root `src/` owns top-level command and platform orchestration.
- Root `src/` is the canonical location for slash-command execution and future platform adapters.
- `packages/core` continues to own analysis internals and artifact generation.
- Existing behavior continues to work during the transition.

This increment is not a full migration. It introduces the architectural seam that later Priority 5 steps can build on.

## Components

Recommended component split:

- `src/commands/`
  Canonical home for command parsing, direct command execution, result formatting, and platform-neutral routing.
- `src/platforms/opencode/`
  OpenCode-specific adapter that creates the session-backed `agentExecutor` and wires it into the root command layer.
- `src/commands/prompt.ts` or similar
  Canonical home for command-bridge prompt creation currently exposed through `createCommandPrompt`.
- `packages/core/src/commands/workflows.ts`
  Temporary home for lower-level workflow functions backed by pipeline and artifacts, unless a subset is lifted cleanly into root `src/` without widening scope.
- `packages/core`
  Continues to own `runPipeline`, `runSingleFilePipeline`, scanner checks, graph/schema logic, manifest logic, and renderer behavior.

Recommended movement for this increment:

- Move `executeDirectCommand` and user-facing formatting helpers into root `src/commands/`.
- Move OpenCode hook creation into `src/platforms/opencode/`.
- Move `createCommandPrompt` into root `src/` because it belongs to the repo-level command surface.
- Keep summary/chat/comprehend workflow functions in or near `packages/core` for now unless a minimal lift is clearly cleaner.

## Data Flow

After this increment, command execution should follow one canonical top-down path:

1. `.opencode/plugins/text-comprehend.ts` calls a root `src/platforms/opencode` adapter.
2. The adapter creates the session-backed `agentExecutor`.
3. The adapter passes command name, args, and `rootDir` into root `src/commands`.
4. Root `src/commands` parses flags and command arguments, selects the correct workflow, and formats user-facing output.
5. Root command orchestration calls lower-level workflow functions backed by `packages/core` pipeline and artifact logic.
6. `scripts/command-bridge.ts` also calls the shared root `src/` command surface for prompt creation.

This creates one canonical place for command parsing and output formatting across plugin and bridge entrypaths.

## Error Handling

This increment preserves current user-visible behavior while clarifying ownership by layer.

- Root `src/commands` handles command-surface concerns such as missing arguments, unsupported flags, command routing issues, and user-facing result formatting.
- `packages/core` continues to throw or return workflow and pipeline errors such as missing artifacts, unsupported file types, failed analysis, failed review, and filesystem failures during analysis.
- `src/platforms/opencode` handles adapter-specific failures such as session creation, prompt execution, empty agent responses, and cleanup.

Rules for this increment:

- Keep the current plain-text output style.
- Do not introduce a new cross-layer error abstraction yet.
- Format cross-layer errors once at the command surface instead of inside every platform adapter.
- Keep `scripts/command-bridge.ts` failing fast on invalid command names while sourcing prompt text from shared root `src/` code.

## Testing

Verification for this increment should prove that architectural ownership moved without breaking behavior.

- Keep workflow and pipeline tests in `packages/core` as proof that the execution engine still works.
- Move or add command-surface tests so parsing, routing, and output formatting are validated against root `src/commands`.
- Add focused tests for `src/platforms/opencode` only if the adapter contains more than simple wiring.
- Test the shared root prompt builder rather than over-testing `scripts/command-bridge.ts` itself.
- Run workspace `typecheck` after introducing the new layer.

If temporary compatibility re-exports are added, tests should make clear which path is canonical and which is transitional.

## File-Level Direction

The first implementation plan should expect changes in these areas:

- Modify: `.opencode/plugins/text-comprehend.ts`
  Responsibility: switch imports to the root `src/platforms/opencode` adapter.
- Modify: `scripts/command-bridge.ts`
  Responsibility: switch prompt creation imports to the root `src/` command layer.
- Create: `src/commands/`
  Responsibility: own direct command execution, parsing, and formatting.
- Create: `src/platforms/opencode/`
  Responsibility: own OpenCode adapter wiring.
- Create: root `src/` entry modules as needed
  Responsibility: export canonical repo-level command surfaces.
- Modify: `packages/core/src/commands/index.ts`
  Responsibility: narrow exports if needed so lower-level workflows remain available without owning repo-level adapters.
- Modify: `packages/core/src/index.ts`
  Responsibility: stop implying that repo-level command entrypoints are core internals if those entrypoints move to root `src/`.

## Sequencing

The first Priority 5 increment should be sequenced as:

1. Establish root `src/` entry modules and command directories.
2. Move direct command execution and formatting into root `src/commands`.
3. Move the OpenCode adapter into `src/platforms/opencode` and update `.opencode/plugins/text-comprehend.ts`.
4. Move command-bridge prompt creation into root `src/` and update `scripts/command-bridge.ts`.
5. Update tests so root `src/` is the canonical command surface.
6. Keep `.claude-plugin/` support explicitly deferred until this repo alignment step is complete.

## Success Criteria

This increment is complete when all of the following are true:

- Root `src/` exists and is the canonical home for repo-level command surfaces.
- OpenCode plugin wiring imports from root `src/`, not directly from `packages/core/src/commands/opencode-plugin.ts`.
- `scripts/command-bridge.ts` imports from root `src/`, not `packages/core/src/index.ts`.
- Command parsing, routing, and formatting are tested through root `src/`.
- Existing core workflow and pipeline coverage still passes.
- The design continues to defer `.claude-plugin/` support until after this increment.

## Deferred Follow-Up

After this increment lands, later Priority 5 steps can address:

- whether and how to create root `agents/` and `skills/` content
- whether to lift more workflow orchestration from `packages/core`
- whether to scaffold `packages/dashboard/`
- adding `.claude-plugin/` support after the structure is aligned
