# Priority 5 Claude Plugin Packaging Design

## Goal

Add minimal `.claude-plugin/` support so the repository matches the spec's Claude Code packaging expectation without introducing a second unverified runtime implementation path.

## Scope

This design covers the next Priority 5 increment after root `src/`, `agents/`, and `skills/` alignment.

- In scope: create a minimal `.claude-plugin/` packaging layer.
- In scope: align Claude-facing command descriptions to the repo's existing command surfaces.
- In scope: keep the change declarative and packaging-focused.
- Out of scope: a full Claude-specific runtime adapter.
- Out of scope: claiming verified Claude runtime behavior in this environment.
- Out of scope: `packages/dashboard/`.

## Current Context

The repository now has:

- root `src/` command and platform surfaces
- root `agents/`
- root `skills/`
- `.opencode/` plugin support that is actually exercised in this environment

The repository still does not have:

- `.claude-plugin/`
- `packages/dashboard/`

The original spec expects `.claude-plugin/` as part of the top-level plugin structure, so the remaining Priority 5 packaging gap is Claude-facing plugin packaging support.

## Approaches Considered

### 1. Manifest-only wrapper

Add `.claude-plugin/` with the minimum manifest/config files needed for Claude packaging and point its command surface at the repo's existing behavior.

- Pros: smallest change
- Pros: honest about current verification limits
- Pros: avoids a second integration path
- Cons: Claude runtime remains intentionally untested and thin

### 2. Manifest plus mirrored command docs

Add the minimal manifest and duplicate command description files under `.claude-plugin/`.

- Pros: more self-contained packaging
- Cons: creates duplication with existing command descriptions and increases drift risk

### 3. Manifest plus placeholder adapter file

Add a minimal manifest and a Claude adapter entrypoint intended for later expansion.

- Pros: clearer long-term extension point
- Cons: adds unverified code surface and risks guessing the wrong Claude integration shape

## Decision

Use the manifest-only wrapper approach.

This increment should add `.claude-plugin/` as a packaging and manifest layer only, with minimal optional documentation if needed, while keeping the repo's actual execution path single-sourced through the existing code.

## Architecture

Target boundary for this increment:

- `.claude-plugin/` exists as a structural packaging layer for Claude Code.
- It should describe and point at the repository's existing command surfaces and assets.
- It should not introduce a second command execution implementation path.
- Root `src/` remains the canonical repo-level code surface.
- `.opencode/` remains the only actually exercised plugin integration in this environment.

This increment is about structural completeness and truthful packaging metadata, not runtime expansion.

## Components

Recommended minimal component set:

- `.claude-plugin/manifest.json` or equivalent primary plugin descriptor
- optional `.claude-plugin/README.md` if a short verification note is useful
- command-description files only if the packaging format requires them

Recommended content responsibilities:

- The manifest defines plugin identity and exposed command surface.
- The command surface should align to:
  - `/comprehend`
  - `/comprehend-summary`
  - `/comprehend-chat`
- Descriptions should stay aligned with current repo-backed command behavior.
- Any usage note should explicitly state that Claude runtime behavior is not verified in this environment.

## Data Flow

Target conceptual flow after this increment:

1. A Claude user installs or loads the package through `.claude-plugin/`.
2. The plugin manifest exposes the same high-level command surface already supported conceptually elsewhere.
3. Those commands are described as repository-backed behavior.
4. The actual implemented runtime path in the repository still flows through:
   - root `src/commands`
   - root `src/platforms/opencode`
   - `packages/core`
5. The packaging layer must not imply a separately verified Claude execution path.

This keeps command intent aligned while maintaining a single source of truth for implementation.

## Error Handling

The `.claude-plugin/` layer must stay explicit about verification limits.

Rules:

- Do not imply Claude runtime behavior has been exercised if it has not.
- If command support is described, frame it as intended support aligned to existing repo-backed behavior.
- Avoid Claude-specific troubleshooting guidance that assumes unverified runtime details.
- Prefer wording such as:
  - "maps to the existing repository-backed command behavior"
  - "Claude packaging support is present, but runtime behavior is not verified in this environment"

## Testing

Verification for this increment should focus on packaging correctness and consistency.

Recommended verification:

- Ensure `.claude-plugin/` exists at the expected root path.
- If useful, add a lightweight content test asserting that the manifest and any related doc mention canonical command names and repository-backed behavior consistently.
- Run the existing targeted command/workflow tests to confirm no regressions in the real implementation path.
- Run workspace typecheck if non-markdown config or code is added.

The implementation should explicitly record that Claude-specific runtime execution is not tested here.

## File-Level Direction

The next implementation plan should expect changes in these areas:

- Create: `.claude-plugin/manifest.json`
  Responsibility: define minimal Claude plugin identity and command surface.
- Optionally create: `.claude-plugin/README.md`
  Responsibility: note how this packaging layer maps to existing repo-backed behavior and that runtime execution is unverified here.
- Optionally add: lightweight content verification tests if manifest consistency benefits from an automated check.
- Verify: existing root command tests, workflow tests, and typecheck remain green.

## Sequencing

Recommended task order:

1. Add a failing test or verification check for `.claude-plugin/` packaging presence and command references.
2. Create the minimal `.claude-plugin/` manifest.
3. Add a short README only if it improves clarity without duplicating too much command text.
4. Run targeted tests and typecheck.
5. Record that runtime Claude execution remains unverified in this environment.

## Success Criteria

This increment is complete when all of the following are true:

- `.claude-plugin/` exists at the repository root.
- The packaging layer exposes the canonical command surface consistently.
- The content is honest about using the existing repository-backed behavior as the conceptual source of truth.
- Existing command/workflow verification still passes.
- Workspace typecheck still passes when applicable.
- The repository does not claim verified Claude runtime execution in this environment.

## Deferred Follow-Up

After this increment lands, later work can address:

- deeper Claude-specific runtime integration if ever needed
- `packages/dashboard/` scaffolding or implementation
- `/comprehend-explore` dashboard behavior
