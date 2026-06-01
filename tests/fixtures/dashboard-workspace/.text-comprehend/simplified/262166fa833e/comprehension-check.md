# Comprehension Check: Claude Code is running in production across multi-million-line monorepos, decades-old legacy systems, distributed architectures spanning dozens of repositories, and at organizations with thousands of developers. These environments present challenges that smaller, simpler codebases don’t, whether that’s build commands that differ across every subdirectory or legacy code spread across folders with no shared root.

> Source: `sampleText.txt`

## Basic Questions

### Q: How does Claude Code navigate large codebases? *(factual)*
<details>
<summary>Show Answer</summary>

Claude Code navigates codebases the way a software engineer would: it traverses the file system, reads files, uses grep to find what it needs, and follows references across the codebase. It uses agentic search rather than RAG-based embedding retrieval, operating locally on the developer's machine without requiring a pre-built or maintained codebase index.

*Source: lines 5-6*

</details>

### Q: What are the five extension points of Claude Code's harness? *(factual)*
<details>
<summary>Show Answer</summary>

The five extension points are: (1) CLAUDE.md files for codebase context, (2) Hooks for self-improvement and automated checks, (3) Skills for on-demand expertise via progressive disclosure, (4) Plugins for distributing proven setups, and (5) MCP servers for connecting to external tools and data sources. Two additional capabilities are LSP integrations and subagents.

*Source: lines 17-35*

</details>

### Q: Why should teams review their CLAUDE.md configuration regularly? *(factual)*
<details>
<summary>Show Answer</summary>

As models evolve, instructions written for earlier models may become unnecessary or actively constraining for newer ones. Skills and hooks built to compensate for specific limitations become overhead once resolved. Teams should review configuration every three to six months and after major model releases to remove obsolete constraints.

*Source: lines 51-56*

</details>

## Intermediate Questions

### Q: Why does RAG-based code search fail at large scale? *(inferential)*
<details>
<summary>Show Answer</summary>

RAG-based systems fail because embedding pipelines cannot keep up with active engineering teams. By the time a developer queries the index, it reflects an outdated state of the codebase—possibly weeks or days old. Retrieval may return renamed functions or deleted modules with no indication they are out of date.

*Source: lines 8-10*

</details>

### Q: What is the tradeoff of agentic search compared to RAG? *(inferential)*
<details>
<summary>Show Answer</summary>

Agentic search works best when Claude has enough starting context to know where to look. Without proper codebase setup, Claude may hit context-window limits before work begins when searching for vague patterns across very large codebases. Teams that invest in CLAUDE.md files and skills see better navigation results.

*Source: lines 12-12*

</details>

### Q: What organizational role is recommended for managing Claude Code adoption? *(factual)*
<details>
<summary>Show Answer</summary>

A dedicated person or team should own Claude Code configuration. The minimum viable version is a DRI (directly responsible individual) with ownership over configuration, permissions, plugin marketplace, and CLAUDE.md conventions. An emerging role is the agent manager—a hybrid PM/engineer dedicated to the Claude Code ecosystem. These functions typically sit under developer experience or developer productivity.

*Source: lines 58-65*

</details>

## Advanced Questions

### Q: How should governance be approached in large regulated organizations? *(evaluative)*
<details>
<summary>Show Answer</summary>

Governance should start with a defined set of approved skills, required code review processes for AI-generated code, and limited initial access, then expand as confidence builds. Cross-functional working groups should be established early, bringing together engineering, information security, and governance representatives to define requirements and build a rollout roadmap.

*Source: lines 67-69*

</details>
