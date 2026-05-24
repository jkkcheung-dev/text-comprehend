// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardData, DashboardSource } from "./data/types";
import { App } from "./App";
import {
  createAvailableDetail,
  createDocument,
  createDegradedDetail,
  createEmptyDashboardData,
  createFixtureSource,
  createMalformedDashboardData,
  createReadyDashboardData,
  createWorkspaceSource,
} from "./test/factories";

const fixtureSource: DashboardSource = createFixtureSource();

afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders the loading shell before async data resolves", () => {
    render(<App source={fixtureSource} loadData={() => new Promise(() => {})} />);

    expect(screen.getByText("Text Comprehend")).toBeInTheDocument();
    expect(screen.getByText("Search (coming soon)")).toBeInTheDocument();
    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
  });

  it("renders the Option A shell and source details when ready", async () => {
    render(
      <App
        source={createWorkspaceSource("/repo")}
        loadData={async () =>
          createReadyDashboardData({
            source: createWorkspaceSource("/repo").meta,
            documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
          })
        }
      />,
    );

    expect(await screen.findByText("Search (coming soon)")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("/repo")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Facet filters (coming soon)")).toBeInTheDocument();
    expect(screen.getByText("Graph canvas")).toBeInTheDocument();
    expect(screen.getByText("Detail panel")).toBeInTheDocument();
    expect(screen.getByText("# Document One")).toBeInTheDocument();
  });

  it("switches the selected document and degrades only the detail panel", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () =>
          createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [
              createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
              createDocument(
                "doc-2",
                "Document Two",
                createDegradedDetail(
                  ".text-comprehend/simplified/doc-2/layered-summary.md",
                  "ENOENT: missing file",
                ),
              ),
            ],
          })
        }
      />,
    );

    expect(await screen.findByText("# Document One")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Document Two" }));
    expect(screen.getByText("Document detail is unavailable for this artifact.")).toBeInTheDocument();
    expect(screen.getByText(".text-comprehend/simplified/doc-2/layered-summary.md")).toBeInTheDocument();
    expect(screen.getByText("Graph view available when data is ready.")).toBeInTheDocument();
  });

  it("shows the malformed state when the first load fails before any ready data exists", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () => createMalformedDashboardData(fixtureSource.meta)}
      />,
    );

    expect(await screen.findByText("Dashboard data could not be loaded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
  });

  it("preserves the last ready view and shows a warning when a manual refresh returns malformed data", async () => {
    const readyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    const loadData = vi
      .fn<(source: DashboardSource) => Promise<DashboardData>>()
      .mockResolvedValueOnce(readyData)
      .mockResolvedValueOnce(createMalformedDashboardData(fixtureSource.meta));

    render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(await screen.findByText("Dashboard refresh failed. Showing the last loaded data.")).toBeInTheDocument();
    expect(screen.getByText("# Document One")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard data could not be loaded")).not.toBeInTheDocument();
  });

  it("retries the same source and clears the warning after a successful reload", async () => {
    const readyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    const refreshedReadyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One v2"))],
    });

    const loadData = vi
      .fn<(source: DashboardSource) => Promise<DashboardData>>()
      .mockResolvedValueOnce(readyData)
      .mockResolvedValueOnce(createMalformedDashboardData(fixtureSource.meta))
      .mockResolvedValueOnce(refreshedReadyData);

    render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(await screen.findByText("Dashboard refresh failed. Showing the last loaded data.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("# Document One v2")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard refresh failed. Showing the last loaded data.")).not.toBeInTheDocument();
  });

  it("shows the empty state when a refresh returns empty data", async () => {
    const readyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    const loadData = vi
      .fn<(source: DashboardSource) => Promise<DashboardData>>()
      .mockResolvedValueOnce(readyData)
      .mockResolvedValueOnce(createEmptyDashboardData(fixtureSource.meta));

    render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(
      await screen.findByText("Run /comprehend in your workspace to generate dashboard artifacts."),
    ).toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard refresh failed. Showing the last loaded data.")).not.toBeInTheDocument();
  });

  it("shows loading immediately when the source changes", async () => {
    const nextSource: DashboardSource = createWorkspaceSource("/repo");

    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => {
      if (source.meta.mode === "fixture") {
        return createReadyDashboardData({
          source: source.meta,
          documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
        });
      }

      return new Promise(() => {});
    });

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    view.rerender(<App source={nextSource} loadData={loadData} />);

    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
    expect(screen.getByText("Workspace: /repo")).toBeInTheDocument();
  });

  it("drops the stale snapshot immediately when the source key changes", async () => {
    const workspaceSource: DashboardSource = createWorkspaceSource("/repo");

    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => {
      if (source.meta.mode === "fixture") {
        if (loadData.mock.calls.length === 1) {
          return createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
          });
        }

        return createMalformedDashboardData(fixtureSource.meta);
      }

      return new Promise(() => {});
    });

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(await screen.findByText("Dashboard refresh failed. Showing the last loaded data.")).toBeInTheDocument();

    view.rerender(<App source={workspaceSource} loadData={loadData} />);

    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard refresh failed. Showing the last loaded data.")).not.toBeInTheDocument();
  });

  it("does not reload or lose selection when the same logical source is recreated", async () => {
    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => ({
      ...createReadyDashboardData({
        source: source.meta,
        documents: [
          createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
          createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
        ],
      }),
    }));

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Document Two" }));
    expect(screen.getByText("# Document Two")).toBeInTheDocument();

    view.rerender(
      <App
        source={createFixtureSource()}
        loadData={async (source) => loadData(source)}
      />,
    );

    expect(screen.queryByText("Loading dashboard data...")).not.toBeInTheDocument();
    expect(screen.getByText("# Document Two")).toBeInTheDocument();
    expect(loadData).toHaveBeenCalledTimes(1);
  });
});
