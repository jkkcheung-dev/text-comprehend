# Priority 6 Dashboard Component And Interaction Tests Design

**Date:** 2026-05-24
**Status:** Draft for review

## Scope

This design covers only the fifth checklist item under Priority 6 in `docs/superpowers/plans/implementation-priority-checklist.md`:

- Add dashboard component and interaction tests.

It assumes the earlier Priority 6 items are already complete enough to provide:

- a working `packages/dashboard/` app
- the React/Vite dashboard shell UI
- a working `/comprehend-explore` launch path
- the dashboard data-loading resilience behavior already planned and implemented for item 4

## Goals

- Add clear, maintainable test coverage for currently implemented dashboard component behavior.
- Validate user-facing interactions without depending on internal controller state assertions.
- Reduce repeated dashboard test setup through small shared test fixtures and render helpers where they make tests clearer.
- Keep Priority 6 item 5 scoped to already-implemented behavior instead of pulling item 6 UI features forward.

## Non-Goals

- Implement search, facet toggles, zoom-level handling, graph rendering interactions, or richer detail-panel behavior.
- Add keyboard-specific or broader accessibility coverage beyond the existing click-driven user flows.
- Add internal state-machine tests that assert transient reducer or hook state rather than visible outcomes.
- Perform broad production refactors for testability.

## Recommended Approach

Organize item 5 around behavior slices that match current dashboard behavior instead of raw file coverage or a future-feature matrix.

The plan should keep `packages/dashboard/src/App.test.tsx` as the primary integration-style test surface for cross-component user flows, use focused component tests only where a component owns meaningful standalone behavior, and add small shared test helpers to remove repeated data setup. This approach fits the current repository pattern, keeps tests aligned with what users can actually do today, and avoids coupling item 5 to the deferred interaction work in item 6.

## Architecture

Priority 6 item 5 should be split into four layers:

1. App-level interaction coverage in `packages/dashboard/src/App.test.tsx`.
   This remains the main place for user-visible state transitions and interactions that span loading, ready rendering, document selection, refresh/retry behavior, and source resets.
2. Focused shell or component tests under `packages/dashboard/src/features/`.
   These should cover standalone rendering branches or action seams that are easier to test directly than through the full app.
3. Shared dashboard test fixtures and render helpers.
   These should live alongside the dashboard tests and exist only to reduce duplication in ready-data setup, malformed-data setup, and repeated render boilerplate.
4. Focused verification for the dashboard package.
   Final verification should confirm the expanded test suite, dashboard typecheck, and dashboard build all pass without introducing new feature scope.

This keeps the test architecture centered on visible behavior while allowing minimal seams that improve maintainability.

## Test Coverage

### App State And Transition Coverage

`App.test.tsx` should remain the canonical place for end-to-end dashboard behavior that crosses component boundaries, including:

- first-load loading, empty, malformed, and ready rendering
- document selection and detail-panel updates
- degraded document detail behavior that does not break the overall dashboard view
- manual refresh, retry after recoverable failure, and preserved ready snapshots where applicable
- source-change resets and same-logical-source stability

When a behavior is already proven here end-to-end, the item-5 plan should avoid duplicating the same assertions in lower-level component tests unless the component owns a distinct rendering branch that is difficult to exercise cleanly through `App`.

### Shell And Component Coverage

`packages/dashboard/src/features/dashboard-shell.test.tsx` should cover shell-owned action and rendering seams, such as:

- whether refresh and retry controls appear for the supplied dashboard state
- whether shell-level warnings or messages render for the supplied props
- whether non-ready states suppress ready-only controls when appropriate

Additional focused component tests should be added only if a component has enough standalone behavior to justify them. This item should not create a fragmented test suite where every presentational component gets a file without owning meaningful conditional behavior.

### Shared Test Helpers

Minimal test-only helpers are allowed where they make the suite materially easier to maintain. Suitable examples include:

- dashboard data factories for `ready`, `empty`, and `malformed` states
- document factories for available and degraded detail states
- small render helpers for common app or shell setup

These helpers should stay small, local to the dashboard package, and shaped around current tests. This item should not introduce a broad custom testing framework or large abstraction layer.

## Error Handling And Assertion Strategy

Tests for this item should assert stable user-facing outcomes rather than incidental implementation details.

- Prefer visible text, roles, and interaction results over container structure or styling hooks.
- Avoid asserting internal controller state, intermediate hook values, or exact markup arrangements unless a specific accessibility or rendering contract depends on them.
- Do not over-specify placeholder UI such as search or facet areas beyond what is necessary to preserve the current shell contract.
- Prefer one canonical test per behavior rather than repeating the same scenario across app and component tests.

This keeps the suite resilient to small UI reshaping while still protecting the implemented behavior.

## Likely Repository Touch Points

- `packages/dashboard/src/App.test.tsx`
  Expand or reorganize app-level interaction coverage around the current implemented dashboard flows.
- `packages/dashboard/src/features/dashboard-shell.test.tsx`
  Keep focused shell-level action and rendering coverage aligned with current behavior.
- `packages/dashboard/src/features/`
  Add a narrowly scoped new test file only if another component has meaningful standalone branches not already covered through `App`.
- `packages/dashboard/src/test/` or an equivalent dashboard-local test helper area if needed
  Add shared factories or render helpers only when they clearly reduce duplication.

Production code should change only when a very small seam is needed to make tests cleaner or less brittle, and those changes should not alter behavior.

## Verification Strategy

Verification for this item should stay focused on the dashboard package:

- run the expanded dashboard test files
- run dashboard package typecheck
- run dashboard package build
- confirm the final diff does not add deferred Priority 6 item 6 behavior

The purpose of verification is to prove the test suite is stronger without turning item 5 into additional feature work.

## Scope Boundaries

This item is complete when the repository has maintainable component and interaction tests for the dashboard behavior that is already implemented today, specifically around shell rendering, document selection, refresh/retry flows, degraded detail handling, and source-aware resets.

This item is not complete by adding tests for future dashboard capabilities that still belong to Priority 6 item 6. Search, facet toggles, graph interaction behavior, zoom handling, and richer detail-panel interactions should remain explicitly deferred.
