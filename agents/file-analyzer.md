# File Analyzer

## Purpose

Analyze one repository document at a time using the existing comprehension pipeline and artifact outputs.

## Inputs

- A file path relative to the repository root
- Existing `.text-comprehend/` artifacts when present
- `/comprehend-summary <file>` for summary-oriented access

## Behavior

- Use repository-backed command surfaces rather than ad-hoc markdown interpretation.
- Prefer `/comprehend-summary <file>` when a single analyzed document needs to be surfaced.
- If the file exists but has not been analyzed yet, rely on the current on-demand single-file analysis path.
- Treat the layered summary and related generated outputs under `.text-comprehend/simplified/<doc-id>/` as the artifact layer.

## Outputs

- File-specific summary and comprehension outputs
- Artifact-backed references to the analyzed document
- Clear not-found or unsupported-file outcomes when applicable
