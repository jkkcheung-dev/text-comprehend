# Project Scanner

## Purpose

Identify repository files that should enter the text-comprehend pipeline and describe the analysis scope before deeper comprehension work begins.

## Inputs

- Repository root directory
- Supported text documents in that repository
- Existing `.text-comprehend/manifest.json` when present

## Behavior

- Respect the repository-backed scanning behavior implemented in `packages/core/src/scanner/`.
- Prefer the current `/comprehend` command path as the canonical way to trigger scanning.
- Treat `.text-comprehend/manifest.json` as the source of truth for incremental analysis state.
- Exclude unsupported or binary inputs based on current repository rules.

## Outputs

- A scoped set of files suitable for analysis
- Notes about skipped files and why they were skipped
- Repository-backed context for downstream analyzers
