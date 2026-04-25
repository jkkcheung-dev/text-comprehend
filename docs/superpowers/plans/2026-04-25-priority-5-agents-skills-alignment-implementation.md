# Priority 5 Agents And Skills Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full initial root `agents/` and `skills/understand/` asset set so the repository matches the spec structure without overstating capabilities the runtime does not implement.

**Architecture:** Create a thin, truthful top-level asset layer where `agents/` defines the named roles promised by the spec and `skills/understand/SKILL.md` defines the repo-backed understand workflow. Keep these files orchestration-focused and aligned to the current command surfaces in root `src/`, `.opencode/commands/`, and `.text-comprehend/` artifacts rather than adding new backend behavior.

**Tech Stack:** Markdown, Vitest, TypeScript project verification

---

## File Map

- Create: `agents/project-scanner.md`
  Responsibility: define the repository scanning role and its supported input/output contract.
- Create: `agents/file-analyzer.md`
  Responsibility: define per-file comprehension responsibilities and expected artifact-backed outputs.
- Create: `agents/architecture-analyzer.md`
  Responsibility: define synthesis over analyzed document relationships and graph-backed structure.
- Create: `agents/tour-builder.md`
  Responsibility: define guided explanation over analyzed artifacts without promising dashboard behavior.
- Create: `agents/graph-reviewer.md`
  Responsibility: define optional graph review responsibilities aligned with the current review/report feature.
- Create: `skills/understand/SKILL.md`
  Responsibility: define the high-level understand/comprehend workflow in terms of current repo-backed commands and `.text-comprehend/` outputs.
- Create: `src/commands/__tests__/asset-content.test.ts`
  Responsibility: verify the new asset files exist and contain canonical command/artifact references.
- Verify: `src/commands/__tests__/create-command-prompt.test.ts`
  Responsibility: ensure existing root command-surface behavior remains stable.
- Verify: `src/commands/__tests__/execute-direct-command.test.ts`
  Responsibility: ensure existing root command routing remains stable.
- Verify: `src/platforms/opencode/__tests__/command-hook.test.ts`
  Responsibility: ensure plugin hook behavior remains stable.
- Verify: `packages/core/src/commands/__tests__/workflows.test.ts`
  Responsibility: ensure core workflow behavior remains stable.

### Task 1: Add Root Agent Definitions

**Files:**
- Create: `agents/project-scanner.md`
- Create: `agents/file-analyzer.md`
- Create: `agents/architecture-analyzer.md`
- Create: `agents/tour-builder.md`
- Create: `agents/graph-reviewer.md`
- Create: `src/commands/__tests__/asset-content.test.ts`

- [ ] **Step 1: Write the failing asset existence/content test for root agent files**

```ts
// src/commands/__tests__/asset-content.test.ts
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(join(repoRoot, relativePath), "utf-8");
}

describe("repo alignment assets", () => {
  it("defines the full root agent set with repo-backed responsibilities", async () => {
    const agentFiles = [
      "agents/project-scanner.md",
      "agents/file-analyzer.md",
      "agents/architecture-analyzer.md",
      "agents/tour-builder.md",
      "agents/graph-reviewer.md",
    ];

    const contents = await Promise.all(agentFiles.map(readRepoFile));

    expect(contents[0]).toContain(".text-comprehend/");
    expect(contents[1]).toContain("/comprehend-summary");
    expect(contents[2]).toContain("knowledge-graph.json");
    expect(contents[3]).toContain("/comprehend-chat");
    expect(contents[4]).toContain("review-report.json");
  });
});
```

- [ ] **Step 2: Run the asset test to verify it fails**

Run: `npm test -- src/commands/__tests__/asset-content.test.ts`
Expected: FAIL with file-not-found errors because the root `agents/` files do not exist yet.

- [ ] **Step 3: Add the root agent files with truthful, spec-aligned content**

```md
<!-- agents/project-scanner.md -->
# Project Scanner

## Purpose

Identify repository files that should enter the text-comprehend pipeline and describe the analysis scope before deeper comprehension work begins.

## Inputs

- Repository root directory
- Supported text documents in that repository
- Existing `.text-comprehend/manifest.json` when present

## Behavior

- Respect the repository-backed scanning behavior implemented in `packages/core/src/scanner/`.
- Prefer the current `/comprehend` command path as the canonical way to trigger scanning.
- Treat `.text-comprehend/manifest.json` as the source of truth for incremental analysis state.
- Exclude unsupported or binary inputs based on current repository rules.

## Outputs

- A scoped set of files suitable for analysis
- Notes about skipped files and why they were skipped
- Repository-backed context for downstream analyzers
```

```md
<!-- agents/file-analyzer.md -->
# File Analyzer

## Purpose

Analyze one repository document at a time using the existing comprehension pipeline and artifact outputs.

## Inputs

- A file path relative to the repository root
- Existing `.text-comprehend/` artifacts when present
- `/comprehend-summary <file>` for summary-oriented access

## Behavior

- Use repository-backed command surfaces rather than ad-hoc markdown interpretation.
- Prefer `/comprehend-summary <file>` when a single analyzed document needs to be surfaced.
- If the file exists but has not been analyzed yet, rely on the current on-demand single-file analysis path.
- Treat the layered summary and related generated outputs under `.text-comprehend/simplified/<doc-id>/` as the artifact layer.

## Outputs

- File-specific summary and comprehension outputs
- Artifact-backed references to the analyzed document
- Clear not-found or unsupported-file outcomes when applicable
```

```md
<!-- agents/architecture-analyzer.md -->
# Architecture Analyzer

## Purpose

Synthesize higher-level structure across analyzed documents using the repository-backed knowledge graph and generated artifacts.

## Inputs

- `.text-comprehend/knowledge-graph.json`
- Document-level facet outputs already generated by `/comprehend`
- Related summaries and simplified outputs under `.text-comprehend/`

## Behavior

- Work only from analyzed artifacts, not from raw source files when analyzed data already exists.
- Use the knowledge graph as the primary cross-document structure.
- Summarize document relationships, recurring concepts, arguments, and broader repository themes based on current graph content.
- Stay within what the current graph and artifacts support.

## Outputs

- Repository-level structural explanation
- Cross-document relationship summary
- Architecture-oriented interpretation grounded in artifact data
```

```md
<!-- agents/tour-builder.md -->
# Tour Builder

## Purpose

Produce a guided walkthrough of analyzed repository content using existing summaries and related comprehension artifacts.

## Inputs

- `.text-comprehend/knowledge-graph.json`
- `.text-comprehend/simplified/<doc-id>/layered-summary.md`
- Related artifact files generated by the comprehension pipeline

## Behavior

- Build a narrative tour from analyzed artifacts that already exist.
- Prefer layered summaries and graph relationships over raw file inspection.
- Support guided explanation through repository-backed command results such as `/comprehend-summary` and `/comprehend-chat`.
- Do not promise dashboard or visual exploration behavior while `packages/dashboard/` is still absent.

## Outputs

- A guided textual tour of the repository’s analyzed content
- Ordered document or topic walkthrough suggestions
- Artifact-backed explanations suitable for follow-up chat questions
```

```md
<!-- agents/graph-reviewer.md -->
# Graph Reviewer

## Purpose

Validate the completeness and quality of the repository-backed knowledge graph after analysis.

## Inputs

- `.text-comprehend/knowledge-graph.json`
- `.text-comprehend/review-report.json` when review mode is enabled
- Manifest and facet outputs under `.text-comprehend/`

## Behavior

- Align to the existing optional review phase already implemented in the repository.
- Check graph completeness, orphan detection, source-reference validity, and low-confidence conditions through the repo-backed review path.
- Treat `review-report.json` as the structured output when review is requested.
- Avoid implying that review always runs by default.

## Outputs

- Structured review findings
- Error and warning summaries
- Confidence and completeness observations grounded in repository artifacts
```

- [ ] **Step 4: Run the asset test to verify it passes**

Run: `npm test -- src/commands/__tests__/asset-content.test.ts`
Expected: PASS with all root `agents/` files present and containing canonical repo-backed references.

### Task 2: Add The Root Understand Skill

**Files:**
- Create: `skills/understand/SKILL.md`
- Modify: `src/commands/__tests__/asset-content.test.ts`

- [ ] **Step 1: Extend the asset test with a failing skill assertion**

```ts
// src/commands/__tests__/asset-content.test.ts
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(join(repoRoot, relativePath), "utf-8");
}

describe("repo alignment assets", () => {
  it("defines the full root agent set with repo-backed responsibilities", async () => {
    const agentFiles = [
      "agents/project-scanner.md",
      "agents/file-analyzer.md",
      "agents/architecture-analyzer.md",
      "agents/tour-builder.md",
      "agents/graph-reviewer.md",
    ];

    const contents = await Promise.all(agentFiles.map(readRepoFile));

    expect(contents[0]).toContain(".text-comprehend/");
    expect(contents[1]).toContain("/comprehend-summary");
    expect(contents[2]).toContain("knowledge-graph.json");
    expect(contents[3]).toContain("/comprehend-chat");
    expect(contents[4]).toContain("review-report.json");
  });

  it("defines the root understand skill in terms of repo-backed commands and artifacts", async () => {
    const skill = await readRepoFile("skills/understand/SKILL.md");

    expect(skill).toContain("/comprehend");
    expect(skill).toContain("/comprehend-summary");
    expect(skill).toContain("/comprehend-chat");
    expect(skill).toContain(".text-comprehend/");
    expect(skill).toContain("repository-backed");
  });
});
```

- [ ] **Step 2: Run the asset test to verify it fails on the missing skill file**

Run: `npm test -- src/commands/__tests__/asset-content.test.ts`
Expected: FAIL with a file-not-found error for `skills/understand/SKILL.md`.

- [ ] **Step 3: Add the root skill file with a truthful workflow description**

```md
<!-- skills/understand/SKILL.md -->
# Understand Skill

Use this skill to work with repository-backed text comprehension outputs for a project.

## Purpose

Guide users through the existing text-comprehend workflow using the repository’s real command surfaces and generated artifacts.

## Canonical Commands

- `/comprehend`
  Run the full repository-backed analysis pipeline and write outputs under `.text-comprehend/`.
- `/comprehend-summary <file>`
  Show the layered summary for a specific analyzed file, or analyze it on demand if the file exists but is not yet analyzed.
- `/comprehend-chat`
  Answer questions using analyzed artifacts rather than raw source files.

## Workflow

1. Run `/comprehend` to generate or refresh repository-backed artifacts.
2. Use `/comprehend-summary <file>` to inspect a specific document.
3. Use `/comprehend-chat` to ask follow-up questions grounded in analyzed outputs.
4. Read `.text-comprehend/knowledge-graph.json` and related files under `.text-comprehend/` when lower-level artifact inspection is needed.

## Asset Layer

- `agents/project-scanner.md` defines repository input discovery.
- `agents/file-analyzer.md` defines per-file comprehension responsibilities.
- `agents/architecture-analyzer.md` defines cross-document synthesis.
- `agents/tour-builder.md` defines guided walkthrough behavior over analyzed artifacts.
- `agents/graph-reviewer.md` defines optional graph review behavior.

## Constraints

- Treat repository-backed command results as the source of truth.
- Do not reimplement command behavior manually from markdown alone.
- Do not imply dashboard exploration is available while `packages/dashboard/` is still absent.
- Use analyzed artifacts in `.text-comprehend/` instead of raw source files whenever those artifacts already exist.
```

- [ ] **Step 4: Run the asset test to verify it passes**

Run: `npm test -- src/commands/__tests__/asset-content.test.ts`
Expected: PASS with the root understand skill present and referencing the canonical repo-backed commands and artifact path.

### Task 3: Run Full Verification For The Agents/Skills Increment

**Files:**
- Test: `src/commands/__tests__/asset-content.test.ts`
- Test: `src/commands/__tests__/create-command-prompt.test.ts`
- Test: `src/commands/__tests__/execute-direct-command.test.ts`
- Test: `src/platforms/opencode/__tests__/command-hook.test.ts`
- Test: `packages/core/src/commands/__tests__/workflows.test.ts`

- [ ] **Step 1: Run the targeted verification suite**

Run: `npm test -- src/commands/__tests__/asset-content.test.ts src/commands/__tests__/create-command-prompt.test.ts src/commands/__tests__/execute-direct-command.test.ts src/platforms/opencode/__tests__/command-hook.test.ts packages/core/src/commands/__tests__/workflows.test.ts`
Expected: PASS with the new top-level markdown assets present and existing repo-backed command behavior unchanged.

- [ ] **Step 2: Run workspace typecheck**

Run: `npm run typecheck`
Expected: PASS with the new markdown asset structure not affecting TypeScript correctness.

- [ ] **Step 3: Record the intentional scope boundary before completion**

```md
This increment intentionally adds the root `agents/` and `skills/understand/` asset layer without adding new backend capabilities, dashboard code, or `.claude-plugin/` support. Those remain later Priority 5 follow-up work.
```
