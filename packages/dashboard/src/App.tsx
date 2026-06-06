import { useEffect } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardSource } from "./data/types";
import { useDashboardStore } from "./store/dashboard-store";
import { DashboardShell } from "./features/dashboard-shell";

type AppProps = {
  source: DashboardSource;
  loadData?: typeof loadDashboardData;
};

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const initialize = useDashboardStore((s) => s.initialize);
  const setData = useDashboardStore((s) => s.setData);
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

  return <DashboardShell />;
}
