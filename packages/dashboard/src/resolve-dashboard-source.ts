import { createFixtureSource } from "./data/create-fixture-source";
import { createWorkspaceSource } from "./data/create-workspace-source";

export function resolveDashboardSource(searchParams: URLSearchParams) {
  const sourceMode = searchParams.get("source");
  const workspaceRoot = searchParams.get("workspaceRoot");

  if (sourceMode === "workspace" && workspaceRoot) {
    return createWorkspaceSource(workspaceRoot);
  }

  return createFixtureSource("dashboard-workspace");
}
