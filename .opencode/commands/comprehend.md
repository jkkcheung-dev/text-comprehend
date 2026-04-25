---
description: Scan and analyze all text documents in the project
---

Run the full text-comprehend analysis pipeline on this project.

Use the repository-backed plugin result in this command execution as the source of truth.
Do not re-run the workflow manually from this prompt.
Use the generated outputs in `.text-comprehend/` as the source of truth for results.

After completion, report:
- Total files found and processed
- Any files skipped (and why)
- Any errors encountered
- Location of output files

Use `--retry-failed` to retry only previously failed facets for unchanged documents.
