import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(join(repoRoot, relativePath), "utf-8");
}

describe("repo alignment assets", () => {
  it("defines the full root agent set with repo-backed responsibilities", async () => {
    const agentFiles = [
      "agents/project-scanner.md",
      "agents/file-analyzer.md",
      "agents/architecture-analyzer.md",
      "agents/tour-builder.md",
      "agents/graph-reviewer.md",
    ];

    const contents = await Promise.all(agentFiles.map(readRepoFile));

    expect(contents[0]).toContain(".text-comprehend/");
    expect(contents[1]).toContain("/comprehend-summary");
    expect(contents[2]).toContain("knowledge-graph.json");
    expect(contents[3]).toContain("/comprehend-chat");
    expect(contents[4]).toContain("review-report.json");
  });

  it("defines the root understand skill in terms of repo-backed commands and artifacts", async () => {
    const skill = await readRepoFile("skills/understand/SKILL.md");

    expect(skill).toContain("/comprehend");
    expect(skill).toContain("/comprehend-summary");
    expect(skill).toContain("/comprehend-chat");
    expect(skill).toContain(".text-comprehend/");
    expect(skill).toContain("repository-backed");
  });
});
