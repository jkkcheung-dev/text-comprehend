# Understand Skill

Use this skill to work with repository-backed text comprehension outputs for a project.

## Purpose

Guide users through the existing text-comprehend workflow using the repository's real command surfaces and generated artifacts.

## Canonical Commands

- `/comprehend`
  Run the full repository-backed analysis pipeline and write outputs under `.text-comprehend/`.
- `/comprehend-summary <file>`
  Show the layered summary for a specific analyzed file, or analyze it on demand if the file exists but is not yet analyzed.
- `/comprehend-chat`
  Answer questions using analyzed artifacts rather than raw source files.

## Workflow

1. Run `/comprehend` to generate or refresh repository-backed artifacts.
2. Use `/comprehend-summary <file>` to inspect a specific document.
3. Use `/comprehend-chat` to ask follow-up questions grounded in analyzed outputs.
4. Read `.text-comprehend/knowledge-graph.json` and related files under `.text-comprehend/` when lower-level artifact inspection is needed.

## Asset Layer

- `agents/project-scanner.md` defines repository input discovery.
- `agents/file-analyzer.md` defines per-file comprehension responsibilities.
- `agents/architecture-analyzer.md` defines cross-document synthesis.
- `agents/tour-builder.md` defines guided walkthrough behavior over analyzed artifacts.
- `agents/graph-reviewer.md` defines optional graph review behavior.

## Constraints

- Treat repository-backed command results as the source of truth.
- Do not reimplement command behavior manually from markdown alone.
- Do not imply dashboard exploration is available while `packages/dashboard/` is still absent.
- Use analyzed artifacts in `.text-comprehend/` instead of raw source files whenever those artifacts already exist.
