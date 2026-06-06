import { create } from "zustand";
import type { DashboardData, DashboardSource } from "../data/types";
import type { GraphFacetState } from "../features/graph-view-model";
import { createDefaultFacetState } from "../features/graph-view-model";

type ReadyDashboardData = Extract<DashboardData, { state: "ready" }>;

type GraphViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type DashboardStore = {
  source: DashboardSource | null;
  data: DashboardData | null;
  lastReadyData: ReadyDashboardData | null;
  refreshToken: number;
  refreshWarning: string | null;

  searchQuery: string;
  facets: GraphFacetState;
  selectedNodeId: string | null;
  graphViewState: GraphViewState;

  initialize: (source: DashboardSource) => void;
  setData: (data: DashboardData) => void;
  setSearchQuery: (query: string) => void;
  toggleFacet: (facet: keyof GraphFacetState) => void;
  selectNode: (id: string | null) => void;
  refresh: () => void;
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  source: null,
  data: null,
  lastReadyData: null,
  refreshToken: 0,
  refreshWarning: null,

  searchQuery: "",
  facets: createDefaultFacetState(),
  selectedNodeId: null,
  graphViewState: { zoom: 1, offsetX: 0, offsetY: 0 },

  initialize: (source) => set({ source, data: null, lastReadyData: null, searchQuery: "", facets: createDefaultFacetState(), selectedNodeId: null }),

  setData: (data) => set((state) => {
    if (data.state === "ready") {
      return { data, lastReadyData: data, refreshWarning: null };
    }
    if (data.state === "malformed" && state.lastReadyData) {
      return { refreshWarning: "Dashboard refresh failed. Showing the last loaded data." };
    }
    return { data, lastReadyData: null };
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleFacet: (facet) => set((state) => ({
    facets: { ...state.facets, [facet]: !state.facets[facet] },
  })),

  selectNode: (id) => set({ selectedNodeId: id }),

  refresh: () => set((state) => ({ refreshToken: state.refreshToken + 1, refreshWarning: null })),
}));
