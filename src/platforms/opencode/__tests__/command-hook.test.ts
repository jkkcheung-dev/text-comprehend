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
