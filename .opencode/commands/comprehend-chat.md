---
description: Ask questions about analyzed documents
---

Answer the following question using the analyzed document data:

$ARGUMENTS

Instructions:
1. Check if `.text-comprehend/knowledge-graph.json` exists. If not, tell the user to run `/comprehend` first to analyze their documents.
2. Read the knowledge graph from `.text-comprehend/knowledge-graph.json`
3. Read relevant simplified markdown files from `.text-comprehend/simplified/` that relate to the question
4. Answer the question using information from the analyzed documents
5. Cite sources with file paths and line numbers where the information was found
6. If the question cannot be answered from the available data, say so clearly
