import type { AgentExecutor } from "../../../packages/core/src/pipeline/index.js";
import { createOpencodeCommandHook, type SessionPromptClient } from "./command-hook.js";

type Plugin = (context: {
  client: { session: unknown };
  directory: string;
}) => Promise<{
  "command.execute.before": (input: {
    command: string;
    sessionID: string;
    arguments: string;
  }, output: {
    parts: Array<{ type: "text"; text: string }>;
  }) => Promise<void>;
}>;

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
