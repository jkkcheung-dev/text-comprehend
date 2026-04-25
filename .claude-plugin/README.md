# Claude Plugin Packaging

This `.claude-plugin/` directory provides minimal Claude Code packaging support for `text-comprehend`.

## Command Surface

- `/comprehend`
- `/comprehend-summary`
- `/comprehend-chat`

These commands map conceptually to the existing repository-backed command behavior already implemented elsewhere in this repository.

## Verification Boundary

Claude packaging support is present, but runtime behavior is not verified in this environment.

The exercised implementation path in this repository remains the repository-backed OpenCode integration plus the shared command and workflow layers in root `src/` and `packages/core`.
