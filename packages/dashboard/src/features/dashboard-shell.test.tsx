// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAvailableDetail,
  createDocument,
  createMalformedDashboardData,
  createReadyDashboardData,
  createWorkspaceSource,
} from "../test/factories";
import { DashboardShell } from "./dashboard-shell";

afterEach(() => {
  cleanup();
});

const defaultShellProps = {
  selectedDocumentId: null,
  selectedNodeId: null,
  onSelectDocument: () => {},
};

describe("DashboardShell", () => {
  it("renders refresh and retry controls for ready data warnings", () => {
    const onRefresh = vi.fn();
    const onRetry = vi.fn();
    const readyData = createReadyDashboardData({
      source: createWorkspaceSource("/repo").meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    render(
      <DashboardShell
        data={readyData}
        {...defaultShellProps}
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

  it("suppresses the ready-only refresh control when dashboard data is not ready", () => {
    render(
      <DashboardShell
        data={createMalformedDashboardData()}
        {...defaultShellProps}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Refresh data" })).not.toBeInTheDocument();
  });

  it("renders warning and retry controls when data is not ready", () => {
    const onRetry = vi.fn();
    const malformedData = createMalformedDashboardData();

    render(
      <DashboardShell
        data={malformedData}
        {...defaultShellProps}
        refreshWarning="Dashboard data may be stale."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Dashboard data may be stale.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
