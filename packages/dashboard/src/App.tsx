import { useEffect, useState } from "react";
import type { DashboardData } from "./data/types";
import { DashboardShell } from "./features/dashboard-shell";

type AppProps = {
  loadData?: () => Promise<DashboardData>;
};

const emptyDashboardData: DashboardData = { state: "empty" };

export function App({ loadData = async () => emptyDashboardData }: AppProps) {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);

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
            path: "dashboard-shell",
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
