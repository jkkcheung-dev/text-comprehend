---
description: Ask questions about analyzed documents
---

Answer the following question using the analyzed document data:

$ARGUMENTS

Instructions:
1. Check if `.text-comprehend/knowledge-graph.json` exists. If not, tell the user to run `/comprehend` first to analyze their documents.
2. Execute `npx tsx scripts/command-bridge.ts comprehend-chat $ARGUMENTS`
3. Follow the repository-backed chat workflow output exactly
4. Read the matching generated artifacts under `.text-comprehend/simplified/`, including layered summaries, concept glossaries, argument maps, and comprehension checks
5. Answer the question using analyzed artifacts, not raw source files
6. Cite source file paths and summary excerpts when possible
7. If the question cannot be answered from the available analyzed data, say so clearly
