# Priority 5 Root Src Command Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make root `src/` the canonical repo-level command surface by lifting command prompt generation, direct command execution, and the OpenCode adapter out of `packages/core` while keeping `packages/core` as the analysis engine.

**Architecture:** Introduce a real root `src/` layer that owns command parsing, prompt creation, formatting, and OpenCode-specific wiring. Keep workflow and pipeline execution in `packages/core`, and update workspace tooling so root `src/` code participates in tests and typecheck.

**Tech Stack:** TypeScript, Node.js filesystem APIs, Vitest, OpenCode plugin API

---

## File Map

- Modify: `tsconfig.json`
  Responsibility: make root `src/`, `scripts/`, and `.opencode/plugins/` part of the root TypeScript project.
- Modify: `tsconfig.build.json`
  Responsibility: make `npm run build` and `npm run typecheck` include the root project plus `packages/core`.
- Modify: `vitest.config.ts`
  Responsibility: include root `src/**/*.test.ts` files in test discovery.
- Create: `src/index.ts`
  Responsibility: export canonical repo-level command and platform surfaces.
- Create: `src/commands/types.ts`
  Responsibility: define the shared supported-command union and prompt option type.
- Create: `src/commands/create-command-prompt.ts`
  Responsibility: own repository-backed prompt generation for slash commands.
- Create: `src/commands/execute-direct-command.ts`
  Responsibility: own command parsing, workflow dispatch, and user-facing formatting.
- Create: `src/commands/index.ts`
  Responsibility: export the root command surface.
- Create: `src/commands/__tests__/create-command-prompt.test.ts`
  Responsibility: canonical tests for prompt generation and command markdown expectations.
- Create: `src/commands/__tests__/execute-direct-command.test.ts`
  Responsibility: canonical tests for command parsing, routing, and real workflow-stack behavior.
- Create: `src/platforms/opencode/plugin.ts`
  Responsibility: own OpenCode session-to-agent wiring and plugin creation.
- Create: `src/platforms/opencode/command-hook.ts`
  Responsibility: own OpenCode command hook filtering and output injection.
- Create: `src/platforms/opencode/index.ts`
  Responsibility: export the root OpenCode adapter surface.
- Create: `src/platforms/opencode/__tests__/command-hook.test.ts`
  Responsibility: canonical tests for hook handling behavior.
- Modify: `.opencode/plugins/text-comprehend.ts`
  Responsibility: import the plugin from root `src/platforms/opencode`.
- Modify: `scripts/command-bridge.ts`
  Responsibility: import prompt creation from root `src` instead of `packages/core`.
- Modify: `packages/core/src/commands/workflows.ts`
  Responsibility: stop owning `createCommandPrompt`; keep only lower-level workflow functions.
- Modify: `packages/core/src/commands/index.ts`
  Responsibility: export only lower-level workflow helpers after repo-level command surfaces move out.
- Modify: `packages/core/src/commands/__tests__/workflows.test.ts`
  Responsibility: keep workflow-only coverage and drop prompt-generation assertions.
- Delete: `packages/core/src/commands/opencode-plugin.ts`
  Responsibility: remove the old repo-level command adapter from core.
- Delete: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`
  Responsibility: remove the old canonical command-surface test file once root `src/` tests replace it.

### Task 1: Enable Root `src/` Tooling And Lift Prompt Creation

**Files:**
- Modify: `tsconfig.json`
- Modify: `tsconfig.build.json`
- Modify: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/commands/types.ts`
- Create: `src/commands/create-command-prompt.ts`
- Create: `src/commands/index.ts`
- Create: `src/commands/__tests__/create-command-prompt.test.ts`
- Modify: `scripts/command-bridge.ts`
- Modify: `packages/core/src/commands/workflows.ts`
- Modify: `packages/core/src/commands/index.ts`
- Modify: `packages/core/src/commands/__tests__/workflows.test.ts`

- [ ] **Step 1: Write the failing root prompt test and enable root test discovery**

```ts
// src/commands/__tests__/create-command-prompt.test.ts
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createCommandPrompt } from "../index.js";

describe("createCommandPrompt", () => {
  it("creates executable command prompts that invoke the repository bridge", async () => {
    const prompt = await createCommandPrompt({
      command: "comprehend-summary",
      argumentsText: "docs/example.md",
    });

    expect(prompt).toContain("npx tsx scripts/command-bridge.ts comprehend-summary docs/example.md");
    expect(prompt).toContain("Do not reimplement the command behavior from the markdown file itself");
  });

  it("command markdown relies on repository-backed plugin results instead of manual bridge execution", async () => {
    const commandFiles = [
      ".opencode/commands/comprehend.md",
      ".opencode/commands/comprehend-summary.md",
      ".opencode/commands/comprehend-chat.md",
    ];

    for (const file of commandFiles) {
      const content = await readFile(join(process.cwd(), file), "utf-8");
      expect(content).toContain("repository-backed plugin");
      expect(content).not.toContain("scripts/command-bridge.ts");
    }
  });
});
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "packages/*/src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Update root TypeScript project wiring before implementing the module**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": ".",
    "composite": true
  },
  "include": ["src/**/*", "scripts/**/*", ".opencode/plugins/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "references": [
    { "path": "packages/core" }
  ]
}
```

- [ ] **Step 3: Run the new root prompt test to verify it fails**

Run: `npm test -- src/commands/__tests__/create-command-prompt.test.ts`
Expected: FAIL with a module resolution error because `src/commands/index.ts` and `createCommandPrompt` do not exist yet.

- [ ] **Step 4: Implement the root prompt module and move the bridge import to root `src/`**

```ts
// src/commands/types.ts
export type SupportedCommand = "comprehend" | "comprehend-summary" | "comprehend-chat";

export interface CreateCommandPromptOptions {
  command: SupportedCommand;
  argumentsText?: string;
}
```

```ts
// src/commands/create-command-prompt.ts
import type { CreateCommandPromptOptions } from "./types.js";

export async function createCommandPrompt(options: CreateCommandPromptOptions): Promise<string> {
  const args = options.argumentsText?.trim();
  const commandLine = ["npx tsx scripts/command-bridge.ts", options.command, args]
    .filter(Boolean)
    .join(" ");

  return [
    `Run the repository-backed command bridge: \`${commandLine}\`.`,
    "Do not reimplement the command behavior from the markdown file itself.",
    "Use the command bridge output as the source of truth for this slash command.",
  ].join("\n");
}
```

```ts
// src/commands/index.ts
export { createCommandPrompt } from "./create-command-prompt.js";
export type { CreateCommandPromptOptions, SupportedCommand } from "./types.js";
```

```ts
// src/index.ts
export * from "./commands/index.js";
```

```ts
// scripts/command-bridge.ts
#!/usr/bin/env npx tsx

import {
  createCommandPrompt,
} from "../src/index.ts";

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (command !== "comprehend" && command !== "comprehend-summary" && command !== "comprehend-chat") {
    console.error("Usage: npx tsx scripts/command-bridge.ts <comprehend|comprehend-summary|comprehend-chat> [arguments]");
    process.exit(1);
  }

  const prompt = await createCommandPrompt({
    command,
    argumentsText: rest.join(" "),
  });

  console.log(prompt);
}

await main();
```

```ts
// packages/core/src/commands/workflows.ts
import { access, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { runPipeline, runSingleFilePipeline, type AgentExecutor, type PipelineResult } from "../pipeline/index.js";
import { isBinaryDocumentType, isSupportedFileType } from "../scanner/index.js";
import { KnowledgeGraphSchema } from "../schemas/index.js";

export interface RunComprehendWorkflowOptions {
  rootDir: string;
  retryFailed?: boolean;
  review?: boolean;
  reviewStrict?: boolean;
  agentExecutor: AgentExecutor;
}

export interface AnalyzedDocumentListItem {
  id: string;
  filePath: string;
  title: string;
}

export type SummaryWorkflowResult =
  | { status: "not-found" }
  | {
      status: "analyzed" | "analyzed-on-demand";
      document: AnalyzedDocumentListItem;
      layeredSummary: string;
    };

export type ChatWorkflowResult =
  | { status: "missing-artifacts" }
  | {
      status: "ready";
      question: string;
      answer: string;
      documents: Array<AnalyzedDocumentListItem & {
        layeredSummary: string;
        conceptGlossary: string;
        argumentMap: string;
        comprehensionCheck: string;
      }>;
    };

// keep the existing workflow helpers here, but remove createCommandPrompt from this file
```

```ts
// packages/core/src/commands/index.ts
export {
  listAnalyzedDocuments,
  resolveChatWorkflow,
  resolveSummaryWorkflow,
  runComprehendWorkflow,
  type AnalyzedDocumentListItem,
  type ChatWorkflowResult,
  type RunComprehendWorkflowOptions,
  type SummaryWorkflowResult,
} from "./workflows.js";
```

```ts
// packages/core/src/commands/__tests__/workflows.test.ts
import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { AgentExecutor } from "../../pipeline/index.js";
import {
  listAnalyzedDocuments,
  resolveChatWorkflow,
  resolveSummaryWorkflow,
  runComprehendWorkflow,
} from "../workflows.js";

// keep the existing workflow tests here, but remove the old createCommandPrompt import
// and delete the prompt-generation and command-markdown assertions from this file
```

- [ ] **Step 5: Run the root prompt test and workflow test to verify they pass**

Run: `npm test -- src/commands/__tests__/create-command-prompt.test.ts packages/core/src/commands/__tests__/workflows.test.ts`
Expected: PASS with root `src` owning prompt generation and `packages/core` limited to workflow coverage.

### Task 2: Lift Direct Command Execution Into Root `src/commands`

**Files:**
- Create: `src/commands/execute-direct-command.ts`
- Modify: `src/commands/index.ts`
- Create: `src/commands/__tests__/execute-direct-command.test.ts`

- [ ] **Step 1: Write the failing root command execution tests**

```ts
// src/commands/__tests__/execute-direct-command.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { AgentExecutor, PipelineResult } from "../../../packages/core/src/pipeline/index.js";
import { executeDirectCommand } from "../index.js";

const noopExecutor: AgentExecutor = async () => "{}";

function createMockExecutor(): AgentExecutor {
  return async (prompt) => {
    if (prompt.includes("summarization specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({
        documentId,
        summary: {
          thesis: "Test thesis",
          overview: "Test overview paragraph.",
          sections: [
            {
              id: "sec-1",
              heading: "Introduction",
              summary: "Intro summary",
              keyPoints: ["point1", "point2"],
              sourceRange: { documentId, startLine: 1, endLine: 2, excerpt: "excerpt" },
            },
          ],
        },
      });
    }

    if (prompt.includes("concept extraction specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({ documentId, concepts: [], relationships: [] });
    }

    if (prompt.includes("argument analysis specialist")) {
      const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
      return JSON.stringify({ documentId, arguments: [] });
    }

    const documentId = prompt.match(/Document ID: (\S+)/)?.[1] ?? "unknown";
    return JSON.stringify({ documentId, questions: [] });
  };
}

function createPipelineResult(overrides: Partial<PipelineResult> = {}): PipelineResult {
  return {
    documentsProcessed: 1,
    documentsSkipped: 0,
    facetsSucceeded: 4,
    facetsFailed: 0,
    results: [],
    errors: [],
    review: {
      ran: false,
      strict: false,
      report: null,
    },
    ...overrides,
  };
}

describe("executeDirectCommand", () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "tc-plugin-"));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("routes /comprehend --retry-failed through the repository workflow", async () => {
    const runComprehendWorkflow = vi.fn().mockResolvedValue(createPipelineResult({
      documentsProcessed: 2,
      documentsSkipped: 3,
      facetsSucceeded: 5,
    }));

    const output = await executeDirectCommand(
      {
        command: "comprehend",
        argumentsText: "--retry-failed",
        rootDir: "/repo",
        agentExecutor: noopExecutor,
      },
      {
        runComprehendWorkflow,
        resolveSummaryWorkflow: vi.fn(),
        resolveChatWorkflow: vi.fn(),
        listAnalyzedDocuments: vi.fn(),
      },
    );

    expect(runComprehendWorkflow).toHaveBeenCalledWith({
      rootDir: "/repo",
      retryFailed: true,
      agentExecutor: noopExecutor,
    });
    expect(output).toContain("Retry failed facets: yes");
  });

  it("returns analyzed output for /comprehend-summary <file> through the real workflow stack", async () => {
    await writeFile(join(rootDir, "docs-example.md"), "# Example Doc\n\ncontent", "utf-8");
    const agentExecutor = createMockExecutor();

    await executeDirectCommand({
      command: "comprehend",
      argumentsText: "",
      rootDir,
      agentExecutor,
    });

    const output = await executeDirectCommand({
      command: "comprehend-summary",
      argumentsText: "docs-example.md",
      rootDir,
      agentExecutor,
    });

    expect(output).toContain("Status: analyzed");
    expect(output).toContain("Document: docs-example.md");
    expect(output).toContain("Title: Example Doc");
  });
});
```

- [ ] **Step 2: Run the root command execution test to verify it fails**

Run: `npm test -- src/commands/__tests__/execute-direct-command.test.ts`
Expected: FAIL because `executeDirectCommand` is not exported from root `src/commands` yet.

- [ ] **Step 3: Implement root command parsing, dispatch, and formatting**

```ts
// src/commands/execute-direct-command.ts
import type { AgentExecutor, PipelineResult } from "../../packages/core/src/pipeline/index.js";
import {
  listAnalyzedDocuments,
  resolveChatWorkflow,
  resolveSummaryWorkflow,
  runComprehendWorkflow,
} from "../../packages/core/src/commands/workflows.js";

import type { SupportedCommand } from "./types.js";

export interface DirectCommandExecutionOptions {
  command: SupportedCommand;
  argumentsText: string;
  rootDir: string;
  agentExecutor: AgentExecutor;
}

export interface CommandWorkflowDependencies {
  runComprehendWorkflow: typeof runComprehendWorkflow;
  resolveSummaryWorkflow: typeof resolveSummaryWorkflow;
  resolveChatWorkflow: typeof resolveChatWorkflow;
  listAnalyzedDocuments: typeof listAnalyzedDocuments;
}

function parseRetryFailed(argumentsText: string): boolean {
  return argumentsText.split(/\s+/).filter(Boolean).includes("--retry-failed");
}

function parseFlag(argumentsText: string, flag: string): boolean {
  return argumentsText.split(/\s+/).filter(Boolean).includes(flag);
}

function formatPipelineResult(result: PipelineResult, retryFailed: boolean): string {
  const lines = [
    "Repository-backed /comprehend result",
    `Retry failed facets: ${retryFailed ? "yes" : "no"}`,
    `Documents processed: ${result.documentsProcessed}`,
    `Documents skipped: ${result.documentsSkipped}`,
    `Facets succeeded: ${result.facetsSucceeded}`,
    `Facets failed: ${result.facetsFailed}`,
  ];

  if (result.review.ran && result.review.report) {
    lines.push(`Review strict mode: ${result.review.strict ? "yes" : "no"}`);
    lines.push(`Review errors: ${result.review.report.summary.errors}`);
    lines.push(`Review warnings: ${result.review.report.summary.warnings}`);
  }

  if (result.errors.length > 0) {
    lines.push("Errors:");
    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
  }

  lines.push("Outputs written under `.text-comprehend/`.");
  return lines.join("\n");
}

function formatAnalyzedDocuments(documents: Awaited<ReturnType<typeof listAnalyzedDocuments>>): string {
  if (documents.length === 0) {
    return [
      "Repository-backed /comprehend-summary result",
      "No analyzed documents found.",
      "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
    ].join("\n");
  }

  return [
    "Repository-backed /comprehend-summary result",
    "Analyzed documents:",
    ...documents.map((document) => `- ${document.filePath} (${document.title})`),
  ].join("\n");
}

function formatSummaryResult(result: Awaited<ReturnType<typeof resolveSummaryWorkflow>>, filePath: string): string {
  if (result.status === "not-found") {
    return [
      "Repository-backed /comprehend-summary result",
      `File not found: ${filePath}`,
    ].join("\n");
  }

  return [
    "Repository-backed /comprehend-summary result",
    `Status: ${result.status}`,
    `Document: ${result.document.filePath}`,
    `Title: ${result.document.title}`,
    "",
    result.layeredSummary,
  ].join("\n");
}

function formatChatResult(result: Awaited<ReturnType<typeof resolveChatWorkflow>>): string {
  if (result.status === "missing-artifacts") {
    return [
      "Repository-backed /comprehend-chat result",
      "Missing analyzed artifacts.",
      "Run /comprehend first.",
    ].join("\n");
  }

  const lines = [
    "Repository-backed /comprehend-chat result",
    `Question: ${result.question}`,
    `Answer: ${result.answer}`,
  ];

  if (result.documents.length === 0) {
    lines.push("No analyzed documents matched this question.");
    return lines.join("\n");
  }

  lines.push("Relevant analyzed documents:");
  for (const document of result.documents) {
    lines.push(`- ${document.filePath} (${document.title})`);
    lines.push(document.layeredSummary);
  }

  return lines.join("\n");
}

export async function executeDirectCommand(
  options: DirectCommandExecutionOptions,
  dependencies: CommandWorkflowDependencies = {
    runComprehendWorkflow,
    resolveSummaryWorkflow,
    resolveChatWorkflow,
    listAnalyzedDocuments,
  },
): Promise<string> {
  const args = options.argumentsText.trim();

  switch (options.command) {
    case "comprehend": {
      const retryFailed = parseRetryFailed(args);
      const reviewStrict = parseFlag(args, "--review-strict");
      const review = reviewStrict || parseFlag(args, "--review");
      const result = await dependencies.runComprehendWorkflow({
        rootDir: options.rootDir,
        retryFailed,
        ...(review ? { review: true } : {}),
        ...(reviewStrict ? { reviewStrict: true } : {}),
        agentExecutor: options.agentExecutor,
      });
      return formatPipelineResult(result, retryFailed);
    }

    case "comprehend-summary": {
      if (!args) {
        const documents = await dependencies.listAnalyzedDocuments(options.rootDir);
        return formatAnalyzedDocuments(documents);
      }

      const result = await dependencies.resolveSummaryWorkflow({
        rootDir: options.rootDir,
        filePath: args,
        agentExecutor: options.agentExecutor,
      });
      return formatSummaryResult(result, args);
    }

    case "comprehend-chat": {
      const result = await dependencies.resolveChatWorkflow({
        rootDir: options.rootDir,
        question: args,
        agentExecutor: options.agentExecutor,
      });
      return formatChatResult(result);
    }
  }
}
```

```ts
// src/commands/index.ts
export { createCommandPrompt } from "./create-command-prompt.js";
export { executeDirectCommand, type CommandWorkflowDependencies, type DirectCommandExecutionOptions } from "./execute-direct-command.js";
export type { CreateCommandPromptOptions, SupportedCommand } from "./types.js";
```

- [ ] **Step 4: Run the root command execution test to verify it passes**

Run: `npm test -- src/commands/__tests__/execute-direct-command.test.ts`
Expected: PASS with root `src/commands` handling parsing, dispatch, and output formatting.

### Task 3: Lift The OpenCode Adapter Into Root `src/platforms/opencode`

**Files:**
- Create: `src/platforms/opencode/command-hook.ts`
- Create: `src/platforms/opencode/plugin.ts`
- Create: `src/platforms/opencode/index.ts`
- Create: `src/platforms/opencode/__tests__/command-hook.test.ts`
- Modify: `src/index.ts`
- Modify: `.opencode/plugins/text-comprehend.ts`
- Modify: `packages/core/src/commands/index.ts`
- Delete: `packages/core/src/commands/opencode-plugin.ts`
- Delete: `packages/core/src/commands/__tests__/opencode-plugin.test.ts`

- [ ] **Step 1: Write the failing root OpenCode hook test**

```ts
// src/platforms/opencode/__tests__/command-hook.test.ts
import { describe, it, expect, vi } from "vitest";

import type { AgentExecutor } from "../../../../packages/core/src/pipeline/index.js";
import { createOpencodeCommandHook } from "../index.js";

const noopExecutor: AgentExecutor = async () => "{}";

describe("createOpencodeCommandHook", () => {
  it("injects repository-backed command results into the current command output", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn().mockResolvedValue("Repository-backed result body"),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend",
      sessionID: "session-1",
      arguments: "--retry-failed",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Repository-backed result body",
      },
    ]);
  });

  it("ignores unrelated slash commands", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn(),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "other-command",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(false);
    expect(output.parts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the root OpenCode hook test to verify it fails**

Run: `npm test -- src/platforms/opencode/__tests__/command-hook.test.ts`
Expected: FAIL because `createOpencodeCommandHook` is not exported from root `src/platforms/opencode` yet.

- [ ] **Step 3: Implement the root hook and plugin adapter, then update the plugin entrypoint**

```ts
// src/platforms/opencode/command-hook.ts
import type { AgentExecutor } from "../../../packages/core/src/pipeline/index.js";
import { executeDirectCommand, type DirectCommandExecutionOptions } from "../../commands/index.js";

export interface SessionPromptClient {
  session: Record<string, unknown>;
}

export interface OpencodeCommandHookDependencies {
  rootDir: string;
  agentExecutor: AgentExecutor;
  executeCommand?: typeof executeDirectCommand;
}

const HANDLED_COMMANDS = new Set(["comprehend", "comprehend-summary", "comprehend-chat"]);

export function createOpencodeCommandHook(dependencies: OpencodeCommandHookDependencies) {
  const executeCommand = dependencies.executeCommand ?? executeDirectCommand;

  return async (input: {
    command: string;
    sessionID: string;
    arguments: string;
  }, output: {
    parts: Array<{ type: "text"; text: string }>;
  }): Promise<boolean> => {
    if (!HANDLED_COMMANDS.has(input.command)) {
      return false;
    }

    const result = await executeCommand({
      command: input.command as DirectCommandExecutionOptions["command"],
      argumentsText: input.arguments,
      rootDir: dependencies.rootDir,
      agentExecutor: dependencies.agentExecutor,
    });

    output.parts = [{ type: "text", text: result }];

    return true;
  };
}
```

```ts
// src/platforms/opencode/plugin.ts
import type { Plugin } from "@opencode-ai/plugin";

import type { AgentExecutor } from "../../../packages/core/src/pipeline/index.js";
import { createOpencodeCommandHook, type SessionPromptClient } from "./command-hook.js";

type PromptPart = {
  type: string;
  text?: string;
};

type PromptResponse = {
  info?: { id?: string };
  parts?: PromptPart[];
};

type SessionClient = SessionPromptClient & {
  create(options?: { body?: { title?: string } }): Promise<{ data: { id: string } }>;
  prompt(options: {
    path: { id: string };
    body: {
      parts: Array<{ type: "text"; text: string }>;
      tools?: Record<string, boolean>;
    };
  }): Promise<{ data: PromptResponse }>;
  delete(options: { path: { id: string } }): Promise<unknown>;
};

function collectText(response: PromptResponse): string {
  return (response.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

async function createAgentExecutor(sessionClient: SessionClient): Promise<{
  agentExecutor: AgentExecutor;
  dispose(): Promise<void>;
}> {
  const created = await sessionClient.create({
    body: { title: "text-comprehend facet executor" },
  });
  const sessionID = created.data.id;

  return {
    agentExecutor: async (prompt) => {
      const response = await sessionClient.prompt({
        path: { id: sessionID },
        body: {
          tools: {},
          parts: [{ type: "text", text: prompt }],
        },
      });

      const text = collectText(response.data);
      if (!text) {
        throw new Error("OpenCode returned no text for facet analysis prompt");
      }
      return text;
    },
    dispose: async () => {
      await sessionClient.delete({ path: { id: sessionID } }).catch(() => undefined);
    },
  };
}

export const TextComprehendPlugin: Plugin = async ({ client, directory }) => {
  const sessionClient = client.session as SessionClient;

  return {
    "command.execute.before": async (input, output) => {
      const { agentExecutor, dispose } = await createAgentExecutor(sessionClient);
      try {
        const handleCommand = createOpencodeCommandHook({
          rootDir: directory,
          agentExecutor,
        });

        await handleCommand({
          command: input.command,
          sessionID: input.sessionID,
          arguments: input.arguments,
        }, output);
      } finally {
        await dispose();
      }
    },
  };
};

export default TextComprehendPlugin;
```

```ts
// src/platforms/opencode/index.ts
export {
  createOpencodeCommandHook,
  type OpencodeCommandHookDependencies,
  type SessionPromptClient,
} from "./command-hook.js";

export { TextComprehendPlugin } from "./plugin.js";
export { default } from "./plugin.js";
```

```ts
// src/index.ts
export * from "./commands/index.js";
export * from "./platforms/opencode/index.js";
```

```ts
// .opencode/plugins/text-comprehend.ts
import { TextComprehendPlugin } from "../../src/platforms/opencode/index.js";

export { TextComprehendPlugin };
export default TextComprehendPlugin;
```

```ts
// packages/core/src/commands/index.ts
export {
  listAnalyzedDocuments,
  resolveChatWorkflow,
  resolveSummaryWorkflow,
  runComprehendWorkflow,
  type AnalyzedDocumentListItem,
  type ChatWorkflowResult,
  type RunComprehendWorkflowOptions,
  type SummaryWorkflowResult,
} from "./workflows.js";
```

```text
Delete: packages/core/src/commands/opencode-plugin.ts
Delete: packages/core/src/commands/__tests__/opencode-plugin.test.ts
```

- [ ] **Step 4: Run the root adapter tests and verify the old core adapter is gone**

Run: `npm test -- src/platforms/opencode/__tests__/command-hook.test.ts src/commands/__tests__/execute-direct-command.test.ts`
Expected: PASS with root `src/platforms/opencode` owning the hook behavior and no remaining imports from `packages/core/src/commands/opencode-plugin.ts`.

### Task 4: Run Full Verification For The First Priority 5 Increment

**Files:**
- Test: `src/commands/__tests__/create-command-prompt.test.ts`
- Test: `src/commands/__tests__/execute-direct-command.test.ts`
- Test: `src/platforms/opencode/__tests__/command-hook.test.ts`
- Test: `packages/core/src/commands/__tests__/workflows.test.ts`
- Test: `packages/core/src/pipeline/__tests__/pipeline.test.ts`
- Verify: `.opencode/plugins/text-comprehend.ts`
- Verify: `scripts/command-bridge.ts`

- [ ] **Step 1: Run the targeted verification suite**

Run: `npm test -- src/commands/__tests__/create-command-prompt.test.ts src/commands/__tests__/execute-direct-command.test.ts src/platforms/opencode/__tests__/command-hook.test.ts packages/core/src/commands/__tests__/workflows.test.ts packages/core/src/pipeline/__tests__/pipeline.test.ts`
Expected: PASS with root `src/` owning the repo-level command surface and `packages/core` retaining workflow/pipeline coverage.

- [ ] **Step 2: Run workspace typecheck**

Run: `npm run typecheck`
Expected: PASS with root `src`, `scripts`, `.opencode/plugins`, and `packages/core` all typechecking together.

- [ ] **Step 3: Record the intentional scope boundary before completion**

```md
This increment intentionally stops after establishing root `src/` as the canonical command and OpenCode adapter layer. It does not yet add `.claude-plugin/` support, `agents/`, `skills/`, or `packages/dashboard/`; those remain later Priority 5 follow-up work.
```
