---
description: Scan and analyze all text documents in the project
---

Run the full text-comprehend analysis pipeline on this project.

Steps:
1. Scan the working directory for text files (.md, .txt, .rst, .html), excluding node_modules, .git, and .text-comprehend directories
2. Run the analysis pipeline by executing: `npx tsx scripts/test-drive.ts $ARGUMENTS`
3. This will run all 4 specialist agents (summarizer, concept-extractor, argument-mapper, qa-generator) on each document
4. Build the knowledge graph and save it to `.text-comprehend/knowledge-graph.json`
5. Generate human-readable markdown output in `.text-comprehend/simplified/`

After completion, report:
- Total files found and processed
- Any files skipped (and why)
- Any errors encountered
- Location of output files

The `$ARGUMENTS` are passed to the pipeline. Use `--retry-failed` to retry only previously failed documents.
