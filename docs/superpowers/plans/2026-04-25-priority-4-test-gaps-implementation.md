# Priority 4 Test Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining non-UI, non-PDF/DOCX Priority 4 test gaps by adding plugin-level integration coverage for `/comprehend-summary <file>` and its on-demand single-file analysis path.

**Architecture:** Keep the implementation minimal by extending the existing command-plugin integration tests instead of adding new test harnesses. Reuse the current `executeDirectCommand` seam so the tests validate the repository-backed slash-command surface, while leaving already-covered workflow, cleanup, and review-phase tests unchanged.

**Tech Stack:** TypeScript, Node.js filesystem APIs, Vitest

---

## File Map

- Modify: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`
  Responsibility: add plugin-level tests for `/comprehend-summary <file>` returning analyzed output and for the on-demand single-file analysis path.
- Verify: `packages/core/src/commands/__tests__/workflows.test.ts`
  Responsibility: keep existing workflow-level coverage as the lower-level proof for retry, deleted-file cleanup, on-demand analysis, and review behavior that Priority 4 already requires.
- Verify: `packages/core/src/pipeline/__tests__/pipeline.test.ts`
  Responsibility: keep existing pipeline-level coverage for deleted-file cleanup and review report behavior.

## Scope Notes

- `/comprehend` plugin flow is already covered in `packages/core/src/commands/__tests__/opencode-plugin.test.ts`.
- `/comprehend --retry-failed` is already covered in both plugin and workflow tests.
- Deleted-file cleanup covering `.text-comprehend/simplified/<doc-id>/` removal is already covered in `packages/core/src/pipeline/__tests__/pipeline.test.ts`.
- Optional graph review/validation tests already exist in `packages/core/src/graph/__tests__/reviewer.test.ts`, `packages/core/src/pipeline/__tests__/pipeline.test.ts`, and command/workflow tests.
- PDF and DOCX extraction tests are explicitly excluded from this plan per user instruction because the repository still skips those file types in `packages/core/src/scanner/scanner.ts`.

### Task 1: Add Plugin Coverage For `/comprehend-summary <file>`

**Files:**
- Modify: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`
- Test: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`

- [ ] **Step 1: Write the failing plugin test for analyzed summary output**

```ts
  it("routes /comprehend-summary <file> through the repository workflow", async () => {
    const resolveSummaryWorkflow = vi.fn().mockResolvedValue({
      status: "analyzed",
      document: {
        id: "doc-1",
        filePath: "docs/example.md",
        title: "Example Doc",
      },
      layeredSummary: "# Summary\n\nBody",
    });

    const output = await executeDirectCommand(
      {
        command: "comprehend-summary",
        argumentsText: "docs/example.md",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow,
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(resolveSummaryWorkflow).toHaveBeenCalledWith({
      rootDir: "/repo",
      filePath: "docs/example.md",
      agentExecutor: noopExecutor,
    });
    expect(output).toContain("Repository-backed /comprehend-summary result");
    expect(output).toContain("Status: analyzed");
    expect(output).toContain("Document: docs/example.md");
    expect(output).toContain("Title: Example Doc");
    expect(output).toContain("# Summary");
  });
```

- [ ] **Step 2: Run the targeted plugin test to verify it fails**

Run: `npm test -- packages/core/src/commands/__tests__/opencode-plugin.test.ts`
Expected: FAIL because the `/comprehend-summary <file>` case is not covered yet.

- [ ] **Step 3: Add the minimal test case to the plugin test file**

```ts
  it("routes /comprehend-summary <file> through the repository workflow", async () => {
    const resolveSummaryWorkflow = vi.fn().mockResolvedValue({
      status: "analyzed",
      document: {
        id: "doc-1",
        filePath: "docs/example.md",
        title: "Example Doc",
      },
      layeredSummary: "# Summary\n\nBody",
    });

    const output = await executeDirectCommand(
      {
        command: "comprehend-summary",
        argumentsText: "docs/example.md",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow,
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(resolveSummaryWorkflow).toHaveBeenCalledWith({
      rootDir: "/repo",
      filePath: "docs/example.md",
      agentExecutor: noopExecutor,
    });
    expect(output).toContain("Status: analyzed");
    expect(output).toContain("Document: docs/example.md");
    expect(output).toContain("Title: Example Doc");
    expect(output).toContain("# Summary");
  });
```

- [ ] **Step 4: Run the targeted plugin test to verify it passes**

Run: `npm test -- packages/core/src/commands/__tests__/opencode-plugin.test.ts`
Expected: PASS with the new `/comprehend-summary <file>` integration test included.

### Task 2: Add Plugin Coverage For On-Demand Single-File Analysis

**Files:**
- Modify: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`
- Test: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`

- [ ] **Step 1: Write the failing plugin test for analyzed-on-demand output**

```ts
  it("surfaces analyzed-on-demand results for /comprehend-summary <file>", async () => {
    const resolveSummaryWorkflow = vi.fn().mockResolvedValue({
      status: "analyzed-on-demand",
      document: {
        id: "doc-2",
        filePath: "notes/new.md",
        title: "New Note",
      },
      layeredSummary: "# On-demand Summary\n\nGenerated",
    });

    const output = await executeDirectCommand(
      {
        command: "comprehend-summary",
        argumentsText: "notes/new.md",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow,
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(resolveSummaryWorkflow).toHaveBeenCalledWith({
      rootDir: "/repo",
      filePath: "notes/new.md",
      agentExecutor: noopExecutor,
    });
    expect(output).toContain("Status: analyzed-on-demand");
    expect(output).toContain("Document: notes/new.md");
    expect(output).toContain("Title: New Note");
    expect(output).toContain("# On-demand Summary");
  });
```

- [ ] **Step 2: Run the targeted plugin test to verify it fails**

Run: `npm test -- packages/core/src/commands/__tests__/opencode-plugin.test.ts`
Expected: FAIL because the plugin tests do not yet assert the on-demand status through the command surface.

- [ ] **Step 3: Add the minimal test case to the plugin test file**

```ts
  it("surfaces analyzed-on-demand results for /comprehend-summary <file>", async () => {
    const resolveSummaryWorkflow = vi.fn().mockResolvedValue({
      status: "analyzed-on-demand",
      document: {
        id: "doc-2",
        filePath: "notes/new.md",
        title: "New Note",
      },
      layeredSummary: "# On-demand Summary\n\nGenerated",
    });

    const output = await executeDirectCommand(
      {
        command: "comprehend-summary",
        argumentsText: "notes/new.md",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow: vi.fn(),
        resolveSummaryWorkflow,
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(resolveSummaryWorkflow).toHaveBeenCalledWith({
      rootDir: "/repo",
      filePath: "notes/new.md",
      agentExecutor: noopExecutor,
    });
    expect(output).toContain("Status: analyzed-on-demand");
    expect(output).toContain("Document: notes/new.md");
    expect(output).toContain("Title: New Note");
    expect(output).toContain("# On-demand Summary");
  });
```

- [ ] **Step 4: Run the targeted plugin test to verify it passes**

Run: `npm test -- packages/core/src/commands/__tests__/opencode-plugin.test.ts`
Expected: PASS with both `/comprehend-summary <file>` command-surface scenarios covered.

### Task 3: Verify The Narrowed Priority 4 Scope

**Files:**
- Test: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`
- Test: `packages/core/src/commands/__tests__/workflows.test.ts`
- Test: `packages/core/src/pipeline/__tests__/pipeline.test.ts`
- Test: `packages/core/src/graph/__tests__/reviewer.test.ts`

- [ ] **Step 1: Run the targeted Priority 4 verification suite**

Run: `npm test -- packages/core/src/commands/__tests__/opencode-plugin.test.ts packages/core/src/commands/__tests__/workflows.test.ts packages/core/src/pipeline/__tests__/pipeline.test.ts packages/core/src/graph/__tests__/reviewer.test.ts`
Expected: PASS with plugin, workflow, pipeline, and review coverage proving all non-PDF/DOCX Priority 4 items.

- [ ] **Step 2: Run workspace typecheck**

Run: `npm run typecheck`
Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Record the intentional exclusions before completion**

```md
Priority 4 completion for this branch intentionally excludes PDF and DOCX extraction tests because the current scanner still skips binary document types. Those two checklist items remain blocked on future extraction support rather than missing test harness work.
```
