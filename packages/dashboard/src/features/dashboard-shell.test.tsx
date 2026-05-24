// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardDocument, MalformedDashboardData, ReadyDashboardData } from "../data/types";
import { DashboardShell } from "./dashboard-shell";

afterEach(() => {
  cleanup();
});

function createDocument(id: string, title: string): DashboardDocument {
  return {
    id,
    filePath: `docs/${id}.md`,
    title,
    fileType: "md",
    lastAnalyzed: "2026-04-28T00:00:00.000Z",
    fileHash: `hash-${id}`,
    summary: { thesis: "Thesis", overview: "Overview", sections: [] },
    concepts: [],
    arguments: [],
    questions: [],
    detail: {
      state: "available",
      simplified: {
        layeredSummary: `# ${title}`,
        conceptGlossary: "# Glossary",
        argumentMap: "# Argument Map",
        comprehensionCheck: "# Questions",
      },
    },
  };
}

describe("DashboardShell", () => {
  it("renders refresh and retry controls for ready data warnings", () => {
    const onRefresh = vi.fn();
    const onRetry = vi.fn();
    const readyData: ReadyDashboardData = {
      state: "ready",
      source: {
        mode: "workspace",
        label: "Workspace: /repo",
        workspaceRoot: "/repo",
      },
      graph: {
        version: "1.0.0",
        generatedAt: "2026-04-28T00:00:00.000Z",
        documents: [],
        edges: [],
      },
      documents: [createDocument("doc-1", "Document One")],
    };

    render(
      <DashboardShell
        data={readyData}
        selectedDocumentId={null}
        selectedNodeId={null}
        onSelectDocument={() => {}}
        onRefresh={onRefresh}
        refreshWarning="Dashboard data may be stale."
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Dashboard data may be stale.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders warning and retry controls when data is not ready", () => {
    const onRetry = vi.fn();
    const malformedData: MalformedDashboardData = {
      state: "malformed",
      source: {
        mode: "fixture",
        label: "Fixture: dashboard-workspace",
        fixtureName: "dashboard-workspace",
      },
      path: ".text-comprehend/dashboard.json",
      error: "Unexpected token",
    };

    render(
      <DashboardShell
        data={malformedData}
        selectedDocumentId={null}
        selectedNodeId={null}
        onSelectDocument={() => {}}
        refreshWarning="Dashboard data may be stale."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Dashboard data may be stale.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
