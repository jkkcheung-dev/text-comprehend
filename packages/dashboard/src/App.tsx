import { useEffect, useState } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardData } from "./data/types";
import { DashboardShell } from "./features/dashboard-shell";

type AppProps = {
  loadData?: () => Promise<DashboardData>;
};

async function readDashboardArtifact(path: string): Promise<string> {
  const response = await fetch(`/${path}`);

  if (!response.ok) {
    throw new Error(`ENOENT: ${path}`);
  }

  return response.text();
}

async function defaultLoadData(): Promise<DashboardData> {
  return loadDashboardData(readDashboardArtifact);
}

export function App({ loadData = defaultLoadData }: AppProps) {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadData().then(
      (nextData) => {
        if (!cancelled) {
          setData(nextData);
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setData({
            state: "malformed",
            path: ".text-comprehend/knowledge-graph.json",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  return <DashboardShell data={data} />;
}
