# Text Comprehend Implementation Priority Checklist

This checklist captures the current spec-to-implementation mismatches, ordered by implementation priority.

Dashboard/UI work is intentionally the lowest priority for now.

## Priority 1: Core command behavior must work end-to-end

- [ ] Back the plugin custom command behavior for `/comprehend` with real repository implementation.
- [ ] Support retry behavior for `/comprehend --retry-failed` through that same command path.
- [ ] Back the plugin custom command behavior for `/comprehend-summary <file>` with real repository implementation.
- [ ] Implement the on-demand single-file analysis path used when a requested file exists on disk but has not been analyzed yet.
- [ ] Confirm `/comprehend-chat` has a clearly defined and working behavior over analyzed artifacts, not only command text instructions.

## Priority 2: Core output correctness and cleanup

- [ ] Remove all generated outputs for deleted source files, including `.text-comprehend/simplified/<doc-id>/`, not only facet JSON files.
- [ ] Decide whether document titles should remain filename-inferred or also support extraction from content to fully match the spec wording.

## Priority 3: Missing pipeline capabilities

- [ ] Add the optional validation/review phase described in the spec.
- [ ] Implement `graph-reviewer` behavior or equivalent validation logic for graph completeness, orphan detection, source-reference checks, and low-confidence flags.

## Priority 4: Test gaps for non-UI behavior

- [ ] Add integration tests for the plugin-backed `/comprehend` flow.
- [ ] Add integration tests for `/comprehend --retry-failed`.
- [ ] Add integration tests for `/comprehend-summary <file>`.
- [ ] Add integration tests for the on-demand single-file analysis path.
- [ ] Add tests for deleted-file cleanup covering `simplified/<doc-id>/` removal.
- [ ] Add tests for successful PDF extraction behavior.
- [ ] Add tests for successful DOCX extraction behavior.
- [ ] Add tests for the optional graph review/validation phase.

## Priority 5: Platform packaging and repository structure alignment

- [ ] Add `.claude-plugin/` support for the later Claude Code target.
- [ ] Decide whether root-level `agents/`, `skills/`, `src/`, and `packages/dashboard/` should actually be created to match the spec structure, or whether the implementation should continue using the current `packages/core`-centric layout and the spec should later be adjusted again.

## Priority 6: Dashboard and UI work

- [ ] Implement `packages/dashboard/`.
- [ ] Add the React/Vite dashboard UI.
- [ ] Implement `/comprehend-explore` end-to-end dashboard behavior inside supported AI agents.
- [ ] Add dashboard data-loading resilience behavior.
- [ ] Add dashboard component and interaction tests.
- [ ] Add search, facet toggles, detail panel, zoom-level handling, and graph rendering behavior.

## Notes

- The backend core is already substantially implemented: scanning, manifests, 4-facet analysis orchestration, graph building, markdown rendering, batching, incremental updates, failed-facet retry, and large-file chunking.
- The highest-value work is finishing command-backed behavior and output correctness before expanding platform/UI support.
Read the file @docs/superpowers/plans/implementation-priority-checklist.md to make plan and break down the tasks to implement just Priority 4 section. You can skip all the other content under the "docs/study" directory and the "node_module" directory. You can also ask me any questions to clarify if you need to 