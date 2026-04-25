# Priority 5 Claude Plugin Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimal `.claude-plugin/` packaging support that exposes the canonical command surface structurally without claiming verified Claude runtime behavior.

**Architecture:** Create a thin `.claude-plugin/` layer containing a minimal manifest and a short README that maps Claude packaging intent to the repository's existing command surfaces. Keep verification focused on file presence, consistent command references, and preserving the real implementation path that already runs through root `src/`, `.opencode/`, and `packages/core`.

**Tech Stack:** JSON, Markdown, Vitest, TypeScript workspace verification

---

## File Map

- Create: `.claude-plugin/manifest.json`
  Responsibility: define minimal Claude plugin identity and canonical command surface.
- Create: `.claude-plugin/README.md`
  Responsibility: explain how this packaging layer maps to existing repository-backed behavior and note that Claude runtime execution is unverified here.
- Create: `src/commands/__tests__/claude-plugin-content.test.ts`
  Responsibility: verify the `.claude-plugin/` packaging files exist and reference the canonical commands honestly.
- Verify: `src/commands/__tests__/asset-content.test.ts`
  Responsibility: ensure the new packaging layer does not disturb the existing asset-alignment tests.
- Verify: `src/commands/__tests__/create-command-prompt.test.ts`
  Responsibility: ensure command-surface prompt behavior remains stable.
- Verify: `src/commands/__tests__/execute-direct-command.test.ts`
  Responsibility: ensure command execution behavior remains stable.
- Verify: `src/platforms/opencode/__tests__/command-hook.test.ts`
  Responsibility: ensure the real plugin path remains stable.
- Verify: `packages/core/src/commands/__tests__/workflows.test.ts`
  Responsibility: ensure workflow behavior remains stable.

### Task 1: Add Claude Plugin Packaging Files

**Files:**
- Create: `.claude-plugin/manifest.json`
- Create: `.claude-plugin/README.md`
- Create: `src/commands/__tests__/claude-plugin-content.test.ts`

- [ ] **Step 1: Write the failing Claude packaging content test**

```ts
// src/commands/__tests__/claude-plugin-content.test.ts
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(join(repoRoot, relativePath), "utf-8");
}

describe("claude plugin packaging", () => {
  it("defines a minimal Claude plugin manifest with canonical commands", async () => {
    const raw = await readRepoFile(".claude-plugin/manifest.json");
    const manifest = JSON.parse(raw) as {
      name: string;
      commands: Array<{ name: string; description: string }>;
    };

    expect(manifest.name).toBe("text-comprehend");
    expect(manifest.commands.map((command) => command.name)).toEqual([
      "/comprehend",
      "/comprehend-summary",
      "/comprehend-chat",
    ]);
  });

  it("documents the unverified Claude runtime boundary honestly", async () => {
    const readme = await readRepoFile(".claude-plugin/README.md");

    expect(readme).toContain("repository-backed");
    expect(readme).toContain("runtime behavior is not verified");
    expect(readme).toContain("/comprehend");
  });
});
```

- [ ] **Step 2: Run the Claude packaging test to verify it fails**

Run: `npm test -- src/commands/__tests__/claude-plugin-content.test.ts`
Expected: FAIL with file-not-found errors because `.claude-plugin/manifest.json` and `.claude-plugin/README.md` do not exist yet.

- [ ] **Step 3: Add the minimal Claude packaging files**

```json
// .claude-plugin/manifest.json
{
  "name": "text-comprehend",
  "description": "Repository-backed text comprehension commands for projects",
  "commands": [
    {
      "name": "/comprehend",
      "description": "Run the repository-backed text-comprehend analysis pipeline"
    },
    {
      "name": "/comprehend-summary",
      "description": "Show the layered summary for a specific analyzed document"
    },
    {
      "name": "/comprehend-chat",
      "description": "Answer questions using analyzed document artifacts"
    }
  ]
}
```

```md
<!-- .claude-plugin/README.md -->
# Claude Plugin Packaging

This `.claude-plugin/` directory provides minimal Claude Code packaging support for `text-comprehend`.

## Command Surface

- `/comprehend`
- `/comprehend-summary`
- `/comprehend-chat`

These commands map conceptually to the existing repository-backed command behavior already implemented elsewhere in this repository.

## Verification Boundary

Claude packaging support is present, but runtime behavior is not verified in this environment.

The exercised implementation path in this repository remains the repository-backed OpenCode integration plus the shared command and workflow layers in root `src/` and `packages/core`.
```

- [ ] **Step 4: Run the Claude packaging test to verify it passes**

Run: `npm test -- src/commands/__tests__/claude-plugin-content.test.ts`
Expected: PASS with `.claude-plugin/` present and documenting the canonical command surface honestly.

### Task 2: Run Full Verification For The Claude Packaging Increment

**Files:**
- Test: `src/commands/__tests__/claude-plugin-content.test.ts`
- Test: `src/commands/__tests__/asset-content.test.ts`
- Test: `src/commands/__tests__/create-command-prompt.test.ts`
- Test: `src/commands/__tests__/execute-direct-command.test.ts`
- Test: `src/platforms/opencode/__tests__/command-hook.test.ts`
- Test: `packages/core/src/commands/__tests__/workflows.test.ts`

- [ ] **Step 1: Run the targeted verification suite**

Run: `npm test -- src/commands/__tests__/claude-plugin-content.test.ts src/commands/__tests__/asset-content.test.ts src/commands/__tests__/create-command-prompt.test.ts src/commands/__tests__/execute-direct-command.test.ts src/platforms/opencode/__tests__/command-hook.test.ts packages/core/src/commands/__tests__/workflows.test.ts`
Expected: PASS with the new Claude packaging files present and the existing repository-backed command path unchanged.

- [ ] **Step 2: Run workspace typecheck**

Run: `npm run typecheck`
Expected: PASS with the new packaging files not affecting TypeScript correctness.

- [ ] **Step 3: Record the intentional verification limit before completion**

```md
This increment adds minimal `.claude-plugin/` packaging support only. It does not claim tested Claude runtime execution in this environment, and it does not add a separate Claude-specific command implementation path.
```
