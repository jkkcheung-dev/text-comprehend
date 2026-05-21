import { describe, expect, it } from "vitest";
import { resolveDashboardSource } from "./resolve-dashboard-source";

describe("resolveDashboardSource", () => {
  it("returns a workspace source when source=workspace is provided", () => {
    const source = resolveDashboardSource(
      new URLSearchParams("source=workspace&workspaceRoot=%2Frepo"),
    );

    expect(source.meta).toEqual({
      mode: "workspace",
      label: "Workspace: /repo",
      workspaceRoot: "/repo",
    });
  });

  it("defaults to the dashboard fixture source", () => {
    const source = resolveDashboardSource(new URLSearchParams(""));

    expect(source.meta).toEqual({
      mode: "fixture",
      label: "Fixture: dashboard-workspace",
      fixtureName: "dashboard-workspace",
    });
  });
});
