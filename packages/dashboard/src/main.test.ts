import { describe, expect, it } from "vitest";
import { resolveDashboardSource } from "./resolve-dashboard-source";

describe("resolveDashboardSource", () => {
  it("returns a workspace source for the launcher query string", () => {
    const source = resolveDashboardSource(
      new URL(
        "http://127.0.0.1:4173/?source=workspace&workspaceRoot=%2Frepo%20root",
      ).searchParams,
    );

    expect(source.meta).toEqual({
      mode: "workspace",
      label: "Workspace: /repo root",
      workspaceRoot: "/repo root",
    });
  });

  it("returns a workspace source for the launcher Windows-style query string", () => {
    const source = resolveDashboardSource(
      new URL(
        "http://127.0.0.1:4173/?source=workspace&workspaceRoot=C%3A%5Crepo",
      ).searchParams,
    );

    expect(source.meta).toEqual({
      mode: "workspace",
      label: "Workspace: C:\\repo",
      workspaceRoot: "C:\\repo",
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
