// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { DashboardData, DashboardSource } from "./data/types";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const storeState = {
  data: null as DashboardData | null,
  source: null as DashboardSource | null,
  searchQuery: "",
  facets: { documents: true, concepts: true, arguments: true, questions: true },
  selectedNodeId: null as string | null,
  refreshToken: 0,
  lastReadyData: null as any,
  refreshWarning: null as string | null,
};

const storeActions = {
  initialize: vi.fn((source: DashboardSource) => {
    storeState.source = source;
    storeState.data = null;
  }),
  setData: vi.fn((data: DashboardData) => {
    storeState.data = data;
  }),
  setSearchQuery: vi.fn(),
  toggleFacet: vi.fn(),
  selectNode: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("./store/dashboard-store", () => ({
  useDashboardStore: vi.fn((selector: any) => selector({ ...storeState, ...storeActions })),
}));

import { App } from "./App";
import {
  createAvailableDetail,
  createDocument,
  createEmptyDashboardData,
  createFixtureSource,
  createMalformedDashboardData,
  createReadyDashboardData,
  createWorkspaceSource,
} from "./test/factories";

const fixtureSource: DashboardSource = createFixtureSource();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeState.data = null;
  storeState.source = null;
  storeState.refreshToken = 0;
});

describe("App", () => {
  it("calls initialize and loadData on mount", async () => {
    const loadData = vi.fn().mockResolvedValue(
      createReadyDashboardData({
        documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
      }),
    );

    render(<App source={fixtureSource} loadData={loadData} />);

    expect(storeActions.initialize).toHaveBeenCalledWith(fixtureSource);

    await waitFor(() => {
      expect(loadData).toHaveBeenCalledWith(fixtureSource);
    });

    await waitFor(() => {
      expect(storeActions.setData).toHaveBeenCalled();
      expect(storeState.data).not.toBeNull();
    });
  });

  it("calls initialize with source on mount", () => {
    render(<App source={fixtureSource} loadData={() => new Promise(() => {})} />);

    expect(storeActions.initialize).toHaveBeenCalledWith(fixtureSource);
  });

  it("calls setData with malformed data", async () => {
    const malformedData = createMalformedDashboardData(fixtureSource.meta);
    render(<App source={fixtureSource} loadData={async () => malformedData} />);

    await waitFor(() => {
      expect(storeActions.setData).toHaveBeenCalledWith(malformedData);
    });
    expect(storeState.data).toEqual(malformedData);
  });

  it("calls setData with empty data", async () => {
    const emptyData = createEmptyDashboardData(fixtureSource.meta);
    render(<App source={fixtureSource} loadData={async () => emptyData} />);

    await waitFor(() => {
      expect(storeActions.setData).toHaveBeenCalledWith(emptyData);
    });
    expect(storeState.data).toEqual(emptyData);
  });

  it("calls loadData with workspace source", async () => {
    const workspaceSource = createWorkspaceSource("/repo");
    const loadData = vi.fn().mockResolvedValue(
      createReadyDashboardData({
        source: workspaceSource.meta,
        documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
      }),
    );

    render(<App source={workspaceSource} loadData={loadData} />);

    expect(storeActions.initialize).toHaveBeenCalledWith(workspaceSource);

    await waitFor(() => {
      expect(loadData).toHaveBeenCalledWith(workspaceSource);
    });
  });

  it("loads data with new source when source changes", async () => {
    const loadData = vi.fn().mockResolvedValue(
      createReadyDashboardData({
        documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
      }),
    );
    const workspaceSource = createWorkspaceSource("/repo");

    const { rerender } = render(<App source={fixtureSource} loadData={loadData} />);

    await waitFor(() => {
      expect(loadData).toHaveBeenCalledWith(fixtureSource);
    });

    rerender(<App source={workspaceSource} loadData={loadData} />);

    await waitFor(() => {
      expect(loadData).toHaveBeenCalledWith(workspaceSource);
    });
  });

  it("reloads when refreshToken changes", async () => {
    const loadData = vi.fn().mockResolvedValue(
      createReadyDashboardData({
        documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
      }),
    );

    const { rerender } = render(<App source={fixtureSource} loadData={loadData} />);

    await waitFor(() => {
      expect(loadData).toHaveBeenCalledTimes(1);
    });

    storeState.refreshToken = 1;
    rerender(<App source={fixtureSource} loadData={loadData} />);

    await waitFor(() => {
      expect(loadData).toHaveBeenCalledTimes(2);
    });
  });
});
