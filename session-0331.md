 I already have an approved design spec from a previous brainstorming session.
---
Here's the high-level execution plan:
---
Text Comprehend - High-Level Execution Plan
Scope: Core analysis pipeline for OpenCode. No dashboard. Agents dispatched via OpenCode Task tool.
---
Phase 1: Project Scaffolding
1. Initialize monorepo (package.json, tsconfig, Vitest)
2. Set up packages/core/ directory structure
3. Define Zod schemas matching the spec's TypeScript interfaces
4. Set up OpenCode plugin config (.opencode/ manifest, slash commands)
Phase 2: Document Scanner
5. File discovery - walk working directory, detect supported types (.md, .txt, .rst, .html)
6. .gitignore respect - skip ignored files and binary files
7. File hashing (SHA-256) for incremental update detection
8. Manifest generation and persistence (manifest.json)
Phase 3: Specialist Agents
9. Agent prompt templates - define prompts for each of the 4 specialists
10. Agent output parsing - validate agent responses against Zod schemas
11. Summarizer agent - 3-level hierarchical summary extraction
12. Concept extractor agent - key concepts, definitions, relationships
13. Argument mapper agent - claims, evidence, logical structure, gaps
14. QA generator agent - comprehension questions at multiple difficulty levels
Phase 4: Orchestration Pipeline
15. Batch scheduler - batch documents (up to 5), dispatch all 4 agents per doc in parallel via Task tool
16. Error handling - individual agent failures don't block others, record failures in manifest
17. Incremental updates - compare hashes, only re-analyze changed files
18. --retry-failed flag support
Phase 5: Graph Builder
19. Merge all facet outputs into unified knowledge-graph.json
20. Edge generation - create relationship edges between nodes (contains, supports, defines, etc.)
21. Orphan detection and deduplication
Phase 6: Human-Readable Output
22. Generate layered markdown summaries per document (simplified/)
23. Generate concept glossaries, argument maps, comprehension checks
24. Output directory structure (.text-comprehend/)
Phase 7: Slash Commands & Integration
25. /comprehend - full scan and analyze pipeline
26. /comprehend-chat - question answering against analyzed documents
27. /comprehend-summary <file> - quick single-file summary
28. /comprehend-explore - stub that reports "dashboard not yet available"
Phase 8: Validation & Polish
29. Optional --review flag - graph-reviewer validates completeness
30. Large file chunking (>100KB)
31. End-to-end integration test with sample test corpus
---
Total: ~31 steps across 8 phases. Each phase produces working, testable output and ends with a commit. Phases 2-3 are the heaviest (core logic), Phase 4-5 tie everything together, and Phase 6-7 deliver the user-facing outputs
---
Self-review plan against spec

So this is V1 plan, and I want you to iterate the cycle of "building, testing output, comparing it to the product spec" 2 times for just phases 1-3. This time we ignore the other phases first, we will work on them next time. I want you to slowly progress development, so that we would have a more reliable project output. 