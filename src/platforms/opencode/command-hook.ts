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
