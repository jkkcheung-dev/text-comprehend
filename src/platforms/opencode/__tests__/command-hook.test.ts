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

  it("passes through production-shaped ready output for /comprehend-explore", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi
        .fn()
        .mockResolvedValue("Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173"),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173",
      },
    ]);
  });

  it("passes through production-shaped missing-analysis output for /comprehend-explore", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi
        .fn()
        .mockResolvedValue("Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`."),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
      },
    ]);
  });

  it("still formats structured dashboard launch results through the shared adapter", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn().mockResolvedValue({
        launch: {
          status: "ready",
          workspaceRoot: "/repo",
          url: "http://127.0.0.1:4173",
          message: "Dashboard ready: http://127.0.0.1:4173",
        },
        browserOpen: {
          status: "unsupported",
        },
      }),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173",
      },
    ]);
  });

  it("reports opened when the production-shaped path returns a structured opened result", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn().mockResolvedValue({
        launch: {
          status: "ready",
          workspaceRoot: "/repo",
          url: "http://127.0.0.1:4173",
          message: "Dashboard ready: http://127.0.0.1:4173",
        },
        browserOpen: {
          status: "opened",
        },
      }),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Opened dashboard: http://127.0.0.1:4173",
      },
    ]);
  });

  it("reports browser-open failure and manual-open guidance in the production-shaped path", async () => {
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn().mockResolvedValue({
        launch: {
          status: "ready",
          workspaceRoot: "/repo",
          url: "http://127.0.0.1:4173",
          message: "Dashboard ready: http://127.0.0.1:4173",
        },
        browserOpen: {
          status: "failed",
          detail: "spawn xdg-open ENOENT",
        },
      }),
    });

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173\nBrowser open failed: spawn xdg-open ENOENT",
      },
    ]);
  });

  it("uses the real OpenCode /comprehend-explore path to report opened when browser launch succeeds", async () => {
    vi.resetModules();
    const executeDirectCommand = vi.fn().mockResolvedValue("shared fallback should not be used");

    vi.doMock("../../commands/index.js", () => ({
      executeDirectCommand,
    }));

    const { createOpencodeCommandHook: createHookWithDefaults } = await import("../command-hook.js");

    const hook = createHookWithDefaults({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      launchDashboard: vi.fn().mockResolvedValue({
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      }),
      openBrowserUrl: vi.fn().mockResolvedValue({ status: "opened" }),
    } as never);

    const output = {
      parts: [],
    };

    const handled = await hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output);

    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Opened dashboard: http://127.0.0.1:4173",
      },
    ]);
    expect(executeDirectCommand).not.toHaveBeenCalled();

    vi.doUnmock("../../commands/index.js");
    vi.resetModules();
  });

  it("ignores unrelated slash commands", async () => {
    const executeCommand = vi.fn();
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand,
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
    expect(executeCommand).not.toHaveBeenCalled();
  });
});
