---
description: Show the layered summary for a specific analyzed document
---

Show a summary for the document at path: $ARGUMENTS

Instructions:
1. If no argument was provided, list all analyzed documents by reading `.text-comprehend/knowledge-graph.json` and showing each document's ID and source path.
2. If a file path argument was provided:
   a. Read `.text-comprehend/knowledge-graph.json` and find the document matching the given path
   b. If found, read and display the layered summary from `.text-comprehend/simplified/<document-id>/`
   c. If not found but the file exists on disk, run single-file analysis by executing: `npx tsx scripts/test-drive.ts --file <path>` and then display the resulting summary
   d. If the file does not exist at all, tell the user the file was not found
