import { useEffect } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardSource } from "./data/types";
import { useDashboardStore } from "./store/dashboard-store";

type AppProps = {
  source: DashboardSource;
  loadData?: typeof loadDashboardData;
};

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const initialize = useDashboardStore((s) => s.initialize);
  const setData = useDashboardStore((s) => s.setData);
  const data = useDashboardStore((s) => s.data);
  const refreshToken = useDashboardStore((s) => s.refreshToken);

  useEffect(() => {
    initialize(source);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadData(source).then((nextData) => {
      if (cancelled) return;
      setData(nextData);
    });
    return () => { cancelled = true; };
  }, [source, loadData, setData, refreshToken]);

  const docCount = data?.state === "ready" ? data.documents.length : 0;
  const nodeCount = data?.state === "ready" ? data.graph.edges.length : 0;

  return (
    <div className="h-screen bg-surface-canvas text-text-primary flex flex-col items-center justify-center font-mono">
      <div className="text-lg mb-2">Text Comprehend</div>
      {data?.state === "loading" && <div className="text-text-muted text-sm">Loading...</div>}
      {data?.state === "empty" && <div className="text-text-muted text-sm">No documents found</div>}
      {data?.state === "malformed" && <div className="text-accent-danger text-sm">Data load failed</div>}
      {data?.state === "ready" && (
        <div className="text-text-secondary text-sm">
          {docCount} document{docCount !== 1 ? "s" : ""} &middot; {nodeCount} node{nodeCount !== 1 ? "s" : ""} loaded
        </div>
      )}
    </div>
  );
}
