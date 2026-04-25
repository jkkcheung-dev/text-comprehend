# Priority 5 Agents And Skills Alignment Design

## Goal

Continue Priority 5 repo alignment by creating real root-level `agents/` and `skills/` assets that match the spec structure while staying truthful to the repository's current runtime behavior.

## Scope

This design covers the next Priority 5 increment after the root `src/` command-layer migration.

- In scope: create full initial root `agents/` and `skills/` structure promised by the spec.
- In scope: make those assets usable and internally consistent with current repo-backed command and artifact flows.
- In scope: keep the asset layer thin and orchestration-focused.
- Out of scope: inventing new backend capabilities just to satisfy asset content.
- Out of scope: `packages/dashboard/` implementation.
- Out of scope: `.claude-plugin/` support.

## Current Context

The repository now has:

- root `src/` for repo-level command and platform surfaces
- `.opencode/` plugin wiring
- `packages/core/` as the execution engine

The repository still does not have:

- root `agents/`
- root `skills/`
- `packages/dashboard/`
- `.claude-plugin/`

The original spec structure still expects root-level agent and skill assets. The next mismatch to resolve is therefore the absence of those top-level directories and files.

## Approaches Considered

### 1. Spec-faithful thin set

Create the full initial root `agents/` and `skills/` file set named by the spec, but keep the contents thin and anchored to behavior the repo already supports.

- Pros: strongest structure alignment with limited implementation risk
- Pros: keeps the increment focused on repo alignment instead of new backend behavior
- Cons: some files are orchestration/instruction assets rather than deep runtime features

### 2. Behavior-first set

Create the full file set and also expand backend behavior so every asset has richer unique logic immediately.

- Pros: stronger apparent feature completeness
- Cons: mixes structural alignment with feature expansion and broadens scope too quickly

### 3. Translation-layer set

Create the full file set mostly as wrappers around existing docs and command flows.

- Pros: fastest path to top-level file coverage
- Cons: higher risk of placeholder-feeling assets that do not become the canonical repo surface

## Decision

Use the spec-faithful thin-set approach.

This increment will create the full initial root `agents/` and `skills/` asset set described by the spec, but each file will stay tightly scoped to the repository-backed command surfaces, artifact flows, and optional review behavior that already exist.

## Architecture

Target boundary for this increment:

- Root `agents/` defines the named agent roles promised by the spec.
- Root `skills/` defines the top-level skill surface promised by the spec.
- These assets remain instruction/orchestration surfaces rather than new execution engines.
- Root `src/` remains the canonical repo-level code entry layer.
- `packages/core` remains the implementation engine for analysis, artifacts, graph logic, workflows, and validation.

This increment is about truthful structure alignment, not backend expansion.

## Components

Recommended top-level asset set:

- `agents/project-scanner.md`
- `agents/file-analyzer.md`
- `agents/architecture-analyzer.md`
- `agents/tour-builder.md`
- `agents/graph-reviewer.md`
- `skills/understand/SKILL.md`

Recommended content responsibilities:

- Each agent file should state:
  - what the agent does
  - what inputs it expects
  - what repo-backed commands or artifacts it depends on
  - what output shape it should produce
- `skills/understand/SKILL.md` should describe the high-level comprehension workflow in terms of the current repo-backed command and artifact paths.

Recommended content style:

- concise
- operational
- truthful to current implementation
- explicit about prerequisites and limitations

## Data Flow

After this increment, the top-down conceptual flow should be:

1. `skills/understand/SKILL.md` describes how the understand/comprehend workflow is invoked.
2. The skill points at repo-backed command surfaces that already exist through root `src/`, `.opencode/plugins/`, and `scripts/command-bridge.ts`.
3. The skill delegates conceptual responsibilities to named root agent definitions in `agents/`.
4. Those agent definitions describe responsibilities such as scanning, file analysis, architecture synthesis, guided tour generation, and graph review.
5. Runtime execution continues through:
   - root `src/commands`
   - root `src/platforms/opencode`
   - `packages/core` workflows and pipeline
6. Generated artifacts continue to live under `.text-comprehend/`.

`agents/` and `skills/` describe and orchestrate the system. `src/` and `packages/core` execute it.

## Error Handling

These new assets must stay capability-bounded.

Rules:

- Do not imply support for behavior the repository does not implement.
- If an agent depends on analyzed artifacts, say so explicitly.
- If a flow is optional or partial today, state that plainly.
- Prefer graceful fallback wording over hard promises.

Examples:

- `graph-reviewer.md` may describe the current optional review/report flow because that behavior exists.
- `tour-builder.md` may describe guided synthesis from analyzed artifacts, but must not promise dashboard behavior while `packages/dashboard/` is absent.
- `skills/understand/SKILL.md` should route users toward repo-backed commands and `.text-comprehend/` outputs instead of implying the markdown file alone defines runtime behavior.

## Testing

Verification for this increment should prove that the new top-level assets exist and match current repo behavior.

Recommended verification:

- Ensure all new files exist at the expected root paths.
- Check that command names, artifact paths, and role names match the repository.
- Run the existing targeted command/workflow tests to confirm the structural additions do not break code paths.
- Run workspace typecheck.

If a light content test is added, it should assert canonical references such as:

- `/comprehend`
- `/comprehend-summary`
- `/comprehend-chat`
- `.text-comprehend/`

## File-Level Direction

The next implementation plan should expect changes in these areas:

- Create: `agents/project-scanner.md`
  Responsibility: define the scanning role over repository inputs and supported files.
- Create: `agents/file-analyzer.md`
  Responsibility: define per-file analysis responsibilities over repository-backed comprehension artifacts.
- Create: `agents/architecture-analyzer.md`
  Responsibility: define higher-level synthesis over analyzed document relationships.
- Create: `agents/tour-builder.md`
  Responsibility: define guided summary/tour behavior over existing analyzed artifacts without promising dashboard behavior.
- Create: `agents/graph-reviewer.md`
  Responsibility: define graph completeness/review responsibilities aligned to the current review feature.
- Create: `skills/understand/SKILL.md`
  Responsibility: define the top-level understand/comprehend skill flow in terms of current repo-backed commands and artifacts.
- Optionally create: markdown asset tests if the repo benefits from lightweight content verification.
- Verify: existing command/workflow/typecheck paths remain green.

## Sequencing

Recommended task order for the next increment:

1. Create the root `agents/` directory and full initial agent file set.
2. Create the root `skills/understand/` directory and `SKILL.md`.
3. Align the content of those files to real commands, artifacts, and optional review behavior.
4. Add lightweight verification only if needed to keep content consistent.
5. Run targeted tests and typecheck.

## Success Criteria

This increment is complete when all of the following are true:

- Root `agents/` exists with the full initial spec-aligned file set.
- Root `skills/understand/SKILL.md` exists.
- The content is operational and truthful to the repo’s current behavior.
- The new asset layer refers to canonical repo-backed command and artifact flows.
- Existing command/workflow verification still passes.
- Workspace typecheck still passes.
- `.claude-plugin/` and `packages/dashboard/` remain explicitly deferred.

## Deferred Follow-Up

After this increment lands, later Priority 5 steps can address:

- lifting more orchestration out of `packages/core` if needed
- creating `packages/dashboard/`
- adding `.claude-plugin/` support
- expanding asset behavior if the runtime grows to support it
