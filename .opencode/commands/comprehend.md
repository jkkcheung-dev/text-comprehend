---
description: Scan and analyze all text documents in the project
---

Run the full text-comprehend analysis pipeline on this project.

Steps:
1. Execute `npx tsx scripts/command-bridge.ts comprehend $ARGUMENTS`
2. Follow the repository-backed command bridge output exactly
3. Use the generated outputs in `.text-comprehend/` as the source of truth for results
4. Report total files processed, files skipped, any facet failures, and output locations

After completion, report:
- Total files found and processed
- Any files skipped (and why)
- Any errors encountered
- Location of output files

The bridge delegates to the repository workflow. Use `--retry-failed` to retry only previously failed facets for unchanged documents.
