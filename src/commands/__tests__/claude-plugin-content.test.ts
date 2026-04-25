import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(join(repoRoot, relativePath), "utf-8");
}

describe("claude plugin packaging", () => {
  it("defines a minimal Claude plugin manifest with canonical commands", async () => {
    const raw = await readRepoFile(".claude-plugin/manifest.json");
    const manifest = JSON.parse(raw) as {
      name: string;
      commands: Array<{ name: string; description: string }>;
    };

    expect(manifest.name).toBe("text-comprehend");
    expect(manifest.commands.map((command) => command.name)).toEqual([
      "/comprehend",
      "/comprehend-summary",
      "/comprehend-chat",
    ]);
  });

  it("documents the unverified Claude runtime boundary honestly", async () => {
    const readme = await readRepoFile(".claude-plugin/README.md");

    expect(readme).toContain("repository-backed");
    expect(readme).toContain("runtime behavior is not verified");
    expect(readme).toContain("/comprehend");
  });
});
