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
