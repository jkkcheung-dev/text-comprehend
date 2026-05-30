# Understand-Anything Sequence Diagram

This diagram shows the main runtime path from the user's command to graph generation and dashboard rendering.

## Legend

- `User` starts the workflows.
- `Plugin Skills` represents commands like `/understand` and `/understand-dashboard`.
- `Analysis Pipeline` represents deterministic analysis plus AI-agent orchestration.
- `Core Graph Builder` normalizes and assembles graph data.
- `Graph Storage` is the local `.understand-anything/` directory.
- `Local Dashboard Server` is the Vite middleware that serves graph files locally.
- `React Dashboard` is the browser UI.

## Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Skills as Plugin Skills
    participant Pipeline as Analysis Pipeline
    participant Core as Core Graph Builder
    participant Storage as Graph Storage<br/>.understand-anything/
    participant Server as Local Dashboard Server<br/>Vite middleware
    participant UI as React Dashboard

    User->>Skills: Run /understand
    Skills->>Pipeline: Scan repo and dispatch analyzers
    Pipeline->>Pipeline: Parse files with deterministic tooling
    Pipeline->>Pipeline: Run AI specialist agents
    Pipeline->>Core: Send analysis results
    Core->>Core: Merge and normalize graph data
    Core->>Storage: Write knowledge-graph.json, meta.json, fingerprints.json
    Storage-->>Skills: Graph artifacts available
    Skills-->>User: Understanding run complete

    User->>Skills: Run /understand-dashboard
    Skills->>Server: Start local dashboard server
    Server-->>User: Return local dashboard URL
    User->>UI: Open dashboard in browser
    UI->>Server: Request /knowledge-graph.json and related files
    Server->>Storage: Read graph artifacts from disk
    Storage-->>Server: Return JSON data
    Server-->>UI: Serve protected local graph endpoints
    UI->>UI: Build state, search index, and graph view
    UI-->>User: Interactive exploration of repository knowledge

    User->>Skills: Run /understand-chat or /understand-diff
    Skills->>Storage: Load existing graph artifacts
    Storage-->>Skills: Return graph context
    Skills-->>User: Reuse graph for explanation, onboarding, or diff analysis
```

## Reading Notes

The key observation is that graph generation happens before the dashboard becomes useful. The dashboard is mostly a viewer for artifacts that already exist on disk.

That is why the system feels local-first:

- analysis produces files
- files become the system's source of truth
- UI and follow-up commands reuse those files rather than calling a traditional backend
