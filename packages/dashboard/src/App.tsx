import { useEffect, useState } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardData, DashboardSource } from "./data/types";
import { DashboardShell } from "./features/dashboard-shell";

type AppProps = {
  source: DashboardSource;
  loadData?: (source: DashboardSource) => Promise<DashboardData>;
};

function getSourceKey(source: DashboardSource): string {
  return source.meta.mode === "fixture"
    ? `fixture:${source.meta.fixtureName}`
    : `workspace:${source.meta.workspaceRoot}`;
}

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const sourceKey = getSourceKey(source);
  const loadingData: DashboardData = { state: "loading", source: source.meta };
  const [data, setData] = useState<DashboardData>({ state: "loading", source: source.meta });
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedNodeId] = useState<string | null>(null);

  const visibleData = getSourceKey({ meta: data.source, read: source.read }) === sourceKey
    ? data
    : loadingData;

  useEffect(() => {
    let cancelled = false;

    void loadData(source).then(
      (nextData) => {
        if (!cancelled) {
          setData(nextData);
          setSelectedDocumentId(nextData.state === "ready" ? nextData.documents[0]?.id ?? null : null);
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setData({
            state: "malformed",
            source: source.meta,
            path: "dashboard-shell",
            error: error instanceof Error ? error.message : String(error),
          });
          setSelectedDocumentId(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [sourceKey]);

  return (
    <DashboardShell
      data={visibleData}
      selectedDocumentId={selectedDocumentId}
      selectedNodeId={selectedNodeId}
      onSelectDocument={setSelectedDocumentId}
    />
  );
}
