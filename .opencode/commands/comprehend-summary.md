---
description: Show the layered summary for a specific analyzed document
---

Show a summary for the document at path: $ARGUMENTS

Instructions:
1. Execute `npx tsx scripts/command-bridge.ts comprehend-summary $ARGUMENTS`
2. Follow the repository-backed command bridge output exactly
3. If no argument was provided, list analyzed documents from `.text-comprehend/knowledge-graph.json`
4. If a file path was provided and it is already analyzed, read `.text-comprehend/simplified/<document-id>/layered-summary.md`
5. If the file exists on disk but is not yet analyzed, run the repository-backed single-file analysis path, then read the generated summary
6. If the file does not exist, report that it was not found
