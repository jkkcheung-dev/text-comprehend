# Concept Glossary: Claude Code is running in production across multi-million-line monorepos, decades-old legacy systems, distributed architectures spanning dozens of repositories, and at organizations with thousands of developers. These environments present challenges that smaller, simpler codebases don’t, whether that’s build commands that differ across every subdirectory or legacy code spread across folders with no shared root.

> Source: `sampleText.txt`

## Core Concepts

### Agentic Search
A code navigation approach where Claude traverses the file system, reads files, uses grep, and follows references like a human engineer, without requiring a pre-built codebase index.

- **Importance:** core
- **Source:** lines 5-12

### RAG (Retrieval-Augmented Generation)
An AI coding tool approach that embeds the entire codebase and retrieves relevant chunks at query time, which can fail at scale when embedding pipelines fall behind active engineering.

- **Importance:** core
- **Source:** lines 8-10

### Tooling Harness
The ecosystem built around the AI model—CLAUDE.md files, hooks, skills, plugins, and MCP servers—that determines Claude Code's real-world performance more than the model alone.

- **Importance:** core
- **Source:** lines 14-17

### CLAUDE.md Files
Context files that Claude reads automatically at the start of every session, providing codebase knowledge. Root file for big-picture context, subdirectory files for local conventions. They should be lean, focused, and layered.

- **Importance:** core
- **Source:** lines 19-19

## Supporting Concepts

### Hooks
Scripts that run at session start or stop to enforce rules, automate checks, and enable self-improvement by proposing CLAUDE.md updates based on session activity.

- **Importance:** supporting
- **Source:** lines 21-21

### Skills
On-demand expertise workflows loaded via progressive disclosure, enabling specialized knowledge to be available only when needed without bloating every session. Can be scoped to specific paths.

- **Importance:** supporting
- **Source:** lines 23-25

### Plugins
Bundled packages of skills, hooks, and MCP configurations that distribute proven setups across teams so new engineers get the same capabilities on day one.

- **Importance:** supporting
- **Source:** lines 27-29

### MCP Servers
Model Context Protocol servers that connect Claude to internal tools, data sources, documentation, ticketing systems, and APIs that it cannot otherwise reach.

- **Importance:** supporting
- **Source:** lines 33-33

### Language Server Protocol (LSP) Integration
Integration that gives Claude symbol-level code navigation—go to definition, find all references—providing precision beyond text pattern matching, especially critical for C and C++ codebases.

- **Importance:** supporting
- **Source:** lines 31-31

### Subagents
Isolated Claude instances with their own context windows that perform tasks and return only final results to the parent agent, enabling separation of exploration from editing.

- **Importance:** supporting
- **Source:** lines 35-35

## Peripheral Concepts

### Progressive Disclosure
A design pattern where specialized expertise is loaded only when needed, preventing context bloat while keeping capabilities available.

- **Importance:** peripheral
- **Source:** lines 23-23

### Agent Manager
An emerging hybrid PM/engineer role dedicated to managing the Claude Code ecosystem—configuration, permissions, plugins, and CLAUDE.md conventions.

- **Importance:** peripheral
- **Source:** lines 63-63
