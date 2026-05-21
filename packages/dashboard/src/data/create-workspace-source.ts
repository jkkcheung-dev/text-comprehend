import type { DashboardSource } from "./types";

const WORKSPACE_ROUTE_PREFIX = "/__text-comprehend-workspace__";

export function createWorkspaceSource(workspaceRoot: string): DashboardSource {
  return {
    meta: {
      mode: "workspace",
      label: `Workspace: ${workspaceRoot}`,
      workspaceRoot,
    },
    read: async (path: string) => {
      const response = await fetch(
        `${WORKSPACE_ROUTE_PREFIX}/${encodeURIComponent(workspaceRoot)}/${path}`,
      );

      if (!response.ok) {
        throw new Error(`ENOENT: ${path}`);
      }

      return response.text();
    },
  };
}
