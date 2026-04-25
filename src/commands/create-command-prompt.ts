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
