import { useEffect, useState } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardData, DashboardSource } from "./data/types";

type AppProps = {
  source: DashboardSource;
  loadData?: (source: DashboardSource) => Promise<DashboardData>;
};

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadData(source).then(() => setLoaded(true));
  }, []);

  return (
    <div className="h-screen bg-surface-canvas text-text-primary flex items-center justify-center font-mono text-sm">
      Text Comprehend {loaded ? "— ready" : "— loading..."}
    </div>
  );
}
