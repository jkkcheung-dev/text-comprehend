# Graph Reviewer

## Purpose

Validate the completeness and quality of the repository-backed knowledge graph after analysis.

## Inputs

- `.text-comprehend/knowledge-graph.json`
- `.text-comprehend/review-report.json` when review mode is enabled
- Manifest and facet outputs under `.text-comprehend/`

## Behavior

- Align to the existing optional review phase already implemented in the repository.
- Check graph completeness, orphan detection, source-reference validity, and low-confidence conditions through the repo-backed review path.
- Treat `review-report.json` as the structured output when review is requested.
- Avoid implying that review always runs by default.

## Outputs

- Structured review findings
- Error and warning summaries
- Confidence and completeness observations grounded in repository artifacts
