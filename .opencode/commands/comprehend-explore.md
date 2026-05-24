---
description: Launch the repository-backed dashboard for analyzed workspace output
---

Launches the local dashboard against the current workspace's `.text-comprehend` output.

Behavior:
- If analyzed output is missing, the command tells you to run `/comprehend` first.
- If the dashboard starts successfully, OpenCode tries to open it in your browser first.
- If browser opening is unsupported or fails, the command returns the local preview URL with manual-open guidance.
- If dashboard startup fails, the command returns `Failed to launch the dashboard. Try again.` instead of raw internal diagnostics.

Typical flow:
1. Run `/comprehend` in the workspace you want to inspect.
2. Run `/comprehend-explore`.
3. If the browser does not open automatically, use the returned URL to open the dashboard manually.

Related commands:
- `/comprehend` to generate `.text-comprehend/knowledge-graph.json`
- `/comprehend-summary [file-path]` to inspect analyzed summaries in text
- `/comprehend-chat <question>` to ask questions over analyzed documents
