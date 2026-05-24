# Priority 6 Dashboard Component And Interaction Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add maintainable dashboard component and interaction tests for the currently implemented shell, detail panel, source badge, and app-level user flows without pulling Priority 6 item 6 features forward.

**Architecture:** Keep `packages/dashboard/src/App.test.tsx` as the integration-style test surface for cross-component flows. Add dashboard-local test helpers to reduce duplication, then add focused component tests only for standalone branches in `DetailPanelShell`, `DashboardShell`, and `SourceStatusBadge`.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, jsdom

---

## File Map

- Create: `packages/dashboard/src/test/factories.ts`
  Shared dashboard test factories for sources, documents, and dashboard data states.
- Modify: `packages/dashboard/src/App.test.tsx`
  Replace repeated inline data setup with the shared factories while preserving app-level interaction coverage.
- Modify: `packages/dashboard/src/features/dashboard-shell.test.tsx`
  Align shell tests with the shared factories and add explicit suppression coverage for ready-only controls.
- Create: `packages/dashboard/src/features/detail-panel-shell.test.tsx`
  Add focused tests for empty selection, available detail rendering, and degraded detail rendering.
- Create: `packages/dashboard/src/features/source-status-badge.test.tsx`
  Add focused tests for fixture and workspace badge rendering.

## Task 1: Add Shared Dashboard Test Factories

**Files:**
- Create: `packages/dashboard/src/test/factories.ts`
- Modify: `packages/dashboard/src/App.test.tsx`

- [ ] **Step 1: Write the failing factory-backed app test update**

```tsx
// inside packages/dashboard/src/App.test.tsx
import {
  createAvailableDetail,
  createDocument,
  createDegradedDetail,
  createFixtureSource,
  createReadyDashboardData,
  createWorkspaceSource,
} from "./test/factories";

const fixtureSource = createFixtureSource();

it("renders the Option A shell and source details when ready", async () => {
  render(
    <App
      source={createWorkspaceSource("/repo")}
      loadData={async () =>
        createReadyDashboardData({
          source: createWorkspaceSource("/repo").meta,
          documents: [
            {
              ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
            },
          ],
        })
      }
    />,
  );

  expect(await screen.findByText("# Document One")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the app test to verify it fails**

Run: `npx vitest run packages/dashboard/src/App.test.tsx`
Expected: FAIL because `./test/factories` does not exist yet.

- [ ] **Step 3: Add the shared dashboard test factories**

```ts
// packages/dashboard/src/test/factories.ts
import type {
  DashboardData,
  DashboardDocument,
  DashboardDocumentDetail,
  DashboardSource,
  DashboardSourceMeta,
  ReadyDashboardData,
} from "../data/types";

export function createFixtureSource(): DashboardSource {
  return {
    meta: {
      mode: "fixture",
      label: "Fixture: dashboard-workspace",
      fixtureName: "dashboard-workspace",
    },
    read: async () => "",
  };
}

export function createWorkspaceSource(workspaceRoot: string): DashboardSource {
  return {
    meta: {
      mode: "workspace",
      label: `Workspace: ${workspaceRoot}`,
      workspaceRoot,
    },
    read: async () => "",
  };
}

export function createAvailableDetail(layeredSummary: string): DashboardDocumentDetail {
  return {
    state: "available",
    simplified: {
      layeredSummary,
      conceptGlossary: "# Glossary",
      argumentMap: "# Argument Map",
      comprehensionCheck: "# Questions",
    },
  };
}

export function createDegradedDetail(path: string, error: string): DashboardDocumentDetail {
  return {
    state: "degraded",
    path,
    error,
  };
}

export function createDocument(
  id: string,
  title: string,
  detail: DashboardDocumentDetail,
): DashboardDocument {
  return {
    id,
    filePath: `docs/${id}.md`,
    title,
    fileType: "md",
    lastAnalyzed: "2026-04-28T00:00:00.000Z",
    fileHash: `hash-${id}`,
    summary: { thesis: "Thesis", overview: "Overview", sections: [] },
    concepts: [],
    arguments: [],
    questions: [],
    detail,
  };
}

export function createReadyDashboardData(options?: {
  source?: DashboardSourceMeta;
  documents?: DashboardDocument[];
}): ReadyDashboardData {
  return {
    state: "ready",
    source: options?.source ?? createFixtureSource().meta,
    graph: {
      version: "1.0.0",
      generatedAt: "2026-04-28T00:00:00.000Z",
      documents: [],
      edges: [],
    },
    documents:
      options?.documents ?? [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
  };
}

export function createEmptyDashboardData(source: DashboardSourceMeta = createFixtureSource().meta): DashboardData {
  return {
    state: "empty",
    source,
  };
}

export function createMalformedDashboardData(source: DashboardSourceMeta = createFixtureSource().meta): DashboardData {
  return {
    state: "malformed",
    source,
    path: ".text-comprehend/knowledge-graph.json",
    error: "Unexpected token",
  };
}
```

- [ ] **Step 4: Update `App.test.tsx` to use the shared factories with no behavior changes**

```tsx
// representative update inside packages/dashboard/src/App.test.tsx
import {
  createAvailableDetail,
  createDegradedDetail,
  createDocument,
  createFixtureSource,
  createMalformedDashboardData,
  createReadyDashboardData,
  createWorkspaceSource,
} from "./test/factories";

const fixtureSource = createFixtureSource();

// later in tests
loadData={async () =>
  createReadyDashboardData({
    source: fixtureSource.meta,
    documents: [
      createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
      createDocument(
        "doc-2",
        "Document Two",
        createDegradedDetail(
          ".text-comprehend/simplified/doc-2/layered-summary.md",
          "ENOENT: missing file",
        ),
      ),
    ],
  })
}

// malformed case
loadData={async () => createMalformedDashboardData(fixtureSource.meta)}
```

- [ ] **Step 5: Re-run the app tests**

Run: `npx vitest run packages/dashboard/src/App.test.tsx`
Expected: PASS with the same app-level behavior coverage preserved.

## Task 2: Tighten Shell Test Coverage Around Visible Controls

**Files:**
- Modify: `packages/dashboard/src/features/dashboard-shell.test.tsx`
- Reuse: `packages/dashboard/src/test/factories.ts`

- [ ] **Step 1: Write a failing shell test for suppressing ready-only controls in non-ready states**

```tsx
it("does not render the refresh action when dashboard data is not ready", () => {
  render(
    <DashboardShell
      data={createMalformedDashboardData()}
      selectedDocumentId={null}
      selectedNodeId={null}
      onSelectDocument={() => {}}
      onRefresh={vi.fn()}
    />,
  );

  expect(screen.queryByRole("button", { name: "Refresh data" })).not.toBeInTheDocument();
  expect(screen.getByText("Document list unavailable until dashboard data is ready.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the shell tests to verify the new assertion fails if needed**

Run: `npx vitest run packages/dashboard/src/features/dashboard-shell.test.tsx`
Expected: FAIL only if the current shell still renders ready-only controls outside the ready state; otherwise proceed by adding the new coverage and keeping the suite green.

- [ ] **Step 3: Refactor shell tests to use shared factories and keep the new coverage**

```tsx
import {
  createDocument,
  createMalformedDashboardData,
  createReadyDashboardData,
  createAvailableDetail,
} from "../test/factories";

const readyData = createReadyDashboardData({
  source: createWorkspaceSource("/repo").meta,
  documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
});
```

- [ ] **Step 4: Re-run the shell tests**

Run: `npx vitest run packages/dashboard/src/features/dashboard-shell.test.tsx`
Expected: PASS with refresh/retry coverage plus explicit suppression coverage for non-ready states.

## Task 3: Add Focused Detail Panel Component Tests

**Files:**
- Create: `packages/dashboard/src/features/detail-panel-shell.test.tsx`
- Reuse: `packages/dashboard/src/test/factories.ts`

- [ ] **Step 1: Write the failing detail-panel tests**

```tsx
// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createAvailableDetail, createDegradedDetail, createDocument } from "../test/factories";
import { DetailPanelShell } from "./detail-panel-shell";

describe("DetailPanelShell", () => {
  it("shows the empty selection state when no document is selected", () => {
    render(<DetailPanelShell document={null} selectedNodeId={null} />);

    expect(screen.getByText("Select a document to inspect its content.")).toBeInTheDocument();
    expect(screen.getByText("Selected node: none")).toBeInTheDocument();
  });

  it("renders layered summary content for available document detail", () => {
    render(
      <DetailPanelShell
        document={createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByText("# Document One")).toBeInTheDocument();
  });

  it("renders the degraded document detail message and artifact path", () => {
    render(
      <DetailPanelShell
        document={createDocument(
          "doc-2",
          "Document Two",
          createDegradedDetail(
            ".text-comprehend/simplified/doc-2/layered-summary.md",
            "ENOENT: missing file",
          ),
        )}
        selectedNodeId="node-1"
      />,
    );

    expect(screen.getByText("Selected node: node-1")).toBeInTheDocument();
    expect(screen.getByText("Document detail is unavailable for this artifact.")).toBeInTheDocument();
    expect(screen.getByText(".text-comprehend/simplified/doc-2/layered-summary.md")).toBeInTheDocument();
    expect(screen.getByText("ENOENT: missing file")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the detail-panel tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/features/detail-panel-shell.test.tsx`
Expected: FAIL because the test file does not exist yet.

- [ ] **Step 3: Add the new detail-panel test file with the minimal assertions above**

```tsx
// use the exact test file from Step 1
```

- [ ] **Step 4: Re-run the detail-panel tests**

Run: `npx vitest run packages/dashboard/src/features/detail-panel-shell.test.tsx`
Expected: PASS

## Task 4: Add Focused Source Badge Component Tests

**Files:**
- Create: `packages/dashboard/src/features/source-status-badge.test.tsx`
- Reuse: `packages/dashboard/src/test/factories.ts`

- [ ] **Step 1: Write the failing source badge tests**

```tsx
// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createFixtureSource, createWorkspaceSource } from "../test/factories";
import { SourceStatusBadge } from "./source-status-badge";

describe("SourceStatusBadge", () => {
  it("renders Fixture for fixture-backed dashboard data", () => {
    render(<SourceStatusBadge source={createFixtureSource().meta} />);
    expect(screen.getByText("Fixture")).toBeInTheDocument();
  });

  it("renders Workspace for workspace-backed dashboard data", () => {
    render(<SourceStatusBadge source={createWorkspaceSource("/repo").meta} />);
    expect(screen.getByText("Workspace")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the source badge tests to verify they fail**

Run: `npx vitest run packages/dashboard/src/features/source-status-badge.test.tsx`
Expected: FAIL because the test file does not exist yet.

- [ ] **Step 3: Add the new source badge test file**

```tsx
// use the exact test file from Step 1
```

- [ ] **Step 4: Re-run the source badge tests**

Run: `npx vitest run packages/dashboard/src/features/source-status-badge.test.tsx`
Expected: PASS

## Task 5: Run Focused Dashboard Verification

**Files:**
- No code changes expected in this task.

- [ ] **Step 1: Run focused dashboard tests**

Run: `npx vitest run packages/dashboard/src/App.test.tsx packages/dashboard/src/features/dashboard-shell.test.tsx packages/dashboard/src/features/detail-panel-shell.test.tsx packages/dashboard/src/features/source-status-badge.test.tsx packages/dashboard/src/data/load-dashboard-data.test.ts packages/dashboard/src/main.test.ts`
Expected: PASS

- [ ] **Step 2: Run dashboard package typecheck**

Run: `npm run typecheck --workspace @text-comprehend/dashboard`
Expected: PASS

- [ ] **Step 3: Run dashboard package build**

Run: `npm run build --workspace @text-comprehend/dashboard`
Expected: PASS

- [ ] **Step 4: Confirm deferred scope stayed deferred**

Check that the final diff does **not** add:

```text
- search behavior
- facet toggle behavior
- graph zoom or node interactions
- new dashboard runtime features
- accessibility-only test expansions beyond current click-driven flows
```

- [ ] **Step 5: Leave the branch ready for review**

Run: `git status --short`
Expected: only the intended dashboard test files and plan/spec docs are modified.
