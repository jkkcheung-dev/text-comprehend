import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";

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
    const openBrowserUrl = vi.fn().mockResolvedValue({ status: "unsupported" });
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi
        .fn()
        .mockResolvedValue({
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
      openBrowserUrl,
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
    expect(openBrowserUrl).toHaveBeenCalledWith("http://127.0.0.1:4173");
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
        .mockResolvedValue({
          launch: {
            status: "missing-analysis-output",
            workspaceRoot: "/repo",
            message: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
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
        text: "Run /comprehend first to generate `.text-comprehend/knowledge-graph.json`.",
      },
    ]);
  });

  it("formats launch-failed output for /comprehend-explore without opening the browser", async () => {
    const openBrowserUrl = vi.fn();
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn().mockResolvedValue({
        launch: {
          status: "launch-failed",
          workspaceRoot: "/repo",
          message: "Failed to launch the dashboard. Try again.",
          detail: "dashboard crashed",
        },
        browserOpen: {
          status: "unsupported",
        },
      }),
      openBrowserUrl,
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
    expect(openBrowserUrl).not.toHaveBeenCalled();
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Failed to launch the dashboard. Try again.",
      },
    ]);
  });

  it("rejects legacy string results for /comprehend-explore", async () => {
    const openBrowserUrl = vi.fn();
    const hook = createOpencodeCommandHook({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
      executeCommand: vi.fn().mockResolvedValue("legacy formatted output"),
      openBrowserUrl,
    });

    const output = {
      parts: [],
    };

    await expect(hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output)).rejects.toThrow("Expected a structured dashboard launch result for /comprehend-explore.");
    expect(openBrowserUrl).not.toHaveBeenCalled();
    expect(output.parts).toEqual([]);
  });

  it("opens the browser from the hook when /comprehend-explore returns a ready launch result", async () => {
    const openBrowserUrl = vi.fn().mockResolvedValue({ status: "opened" });
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
      openBrowserUrl,
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
    expect(openBrowserUrl).toHaveBeenCalledWith("http://127.0.0.1:4173");
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Opened dashboard: http://127.0.0.1:4173",
      },
    ]);
  });

  it("preserves manual-open guidance when hook browser opening is unsupported", async () => {
    const openBrowserUrl = vi.fn().mockResolvedValue({ status: "unsupported" });
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
      openBrowserUrl,
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
    expect(openBrowserUrl).toHaveBeenCalledWith("http://127.0.0.1:4173");
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173",
      },
    ]);
  });

  it("reports browser-open failure and manual-open guidance in the production-shaped path", async () => {
    const openBrowserUrl = vi.fn().mockResolvedValue({
      status: "failed",
      detail: "spawn xdg-open ENOENT",
    });
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
      openBrowserUrl,
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
    expect(openBrowserUrl).toHaveBeenCalledWith("http://127.0.0.1:4173");
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173\nBrowser open failed: spawn xdg-open ENOENT",
      },
    ]);
  });

  it("uses the real OpenCode /comprehend-explore path to report opened when browser launch succeeds", async () => {
    vi.resetModules();
    const executeDirectCommand = vi.fn().mockResolvedValue({
      launch: {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      browserOpen: {
        status: "unsupported",
      },
    });

    vi.doMock("../../../commands/index.js", () => ({
      executeDirectCommand,
    }));

    const { createOpencodeCommandHook: createHookWithDefaults } = await import("../command-hook.js");

    const hook = createHookWithDefaults({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
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
    expect(executeDirectCommand).toHaveBeenCalled();

    vi.doUnmock("../../../commands/index.js");
    vi.resetModules();
  });

  it("does not report opened when the default browser opener exits non-zero after spawn", async () => {
    vi.resetModules();

    const child = new EventEmitter() as EventEmitter & {
      unref: ReturnType<typeof vi.fn>;
    };
    child.unref = vi.fn();

    const spawn = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.emit("spawn");
        child.emit("close", 1, null);
      });

      return child;
    });

    const executeDirectCommand = vi.fn().mockResolvedValue({
      launch: {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      browserOpen: {
        status: "unsupported",
      },
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return {
        ...actual,
        spawn,
      };
    });

    vi.doMock("../../../commands/index.js", () => ({
      executeDirectCommand,
    }));

    const { createOpencodeCommandHook: createHookWithDefaults } = await import("../command-hook.js");

    const hook = createHookWithDefaults({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
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
        text: "Dashboard ready: http://127.0.0.1:4173\nOpen this URL manually: http://127.0.0.1:4173\nBrowser open failed: Browser open command exited with code 1",
      },
    ]);

    vi.doUnmock("node:child_process");
    vi.doUnmock("../../../commands/index.js");
    vi.resetModules();
  });

  it("reports opened when the default browser opener stays alive after spawn", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const child = new EventEmitter() as EventEmitter & {
      unref: ReturnType<typeof vi.fn>;
    };
    child.unref = vi.fn();

    const spawn = vi.fn().mockImplementation(() => {
      queueMicrotask(() => {
        child.emit("spawn");
      });

      return child;
    });

    const executeDirectCommand = vi.fn().mockResolvedValue({
      launch: {
        status: "ready",
        workspaceRoot: "/repo",
        url: "http://127.0.0.1:4173",
        message: "Dashboard ready: http://127.0.0.1:4173",
      },
      browserOpen: {
        status: "unsupported",
      },
    });

    vi.doMock("node:child_process", async () => {
      const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
      return {
        ...actual,
        spawn,
      };
    });

    vi.doMock("../../../commands/index.js", () => ({
      executeDirectCommand,
    }));

    const { createOpencodeCommandHook: createHookWithDefaults } = await import("../command-hook.js");

    const hook = createHookWithDefaults({
      rootDir: "/repo",
      agentExecutor: noopExecutor,
    } as never);

    const output = {
      parts: [],
    };

    let handled: boolean | undefined;
    let settled = false;

    void hook({
      command: "comprehend-explore",
      sessionID: "session-1",
      arguments: "",
    }, output).then((value) => {
      handled = value;
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(100);

    expect(settled).toBe(true);
    expect(handled).toBe(true);
    expect(output.parts).toEqual([
      {
        type: "text",
        text: "Opened dashboard: http://127.0.0.1:4173",
      },
    ]);

    vi.useRealTimers();
    vi.doUnmock("node:child_process");
    vi.doUnmock("../../../commands/index.js");
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
