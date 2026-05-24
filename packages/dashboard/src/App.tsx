import { useEffect, useState } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardData, DashboardSource } from "./data/types";
import { DashboardShell } from "./features/dashboard-shell";

type ReadyDashboardData = Extract<DashboardData, { state: "ready" }>;

type AppProps = {
  source: DashboardSource;
  loadData?: (source: DashboardSource) => Promise<DashboardData>;
};

function getSourceKey(source: DashboardSource): string {
  return source.meta.mode === "fixture"
    ? `fixture:${source.meta.fixtureName}`
    : `workspace:${source.meta.workspaceRoot}`;
}

function createThrownFailure(source: DashboardSource["meta"], error: unknown): DashboardData {
  return {
    state: "malformed",
    source,
    path: "dashboard-shell",
    error: error instanceof Error ? error.message : String(error),
  };
}

function selectDocumentId(
  nextData: ReadyDashboardData,
  previousSelectedDocumentId: string | null,
): string | null {
  if (previousSelectedDocumentId && nextData.documents.some((document) => document.id === previousSelectedDocumentId)) {
    return previousSelectedDocumentId;
  }

  return nextData.documents[0]?.id ?? null;
}

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const sourceKey = getSourceKey(source);
  const loadingData: DashboardData = { state: "loading", source: source.meta };
  const [data, setData] = useState<DashboardData>(loadingData);
  const [lastReadyData, setLastReadyData] = useState<ReadyDashboardData | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [warningSourceKey, setWarningSourceKey] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedNodeId] = useState<string | null>(null);

  const readySnapshotForSource =
    lastReadyData && getSourceKey({ meta: lastReadyData.source, read: source.read }) === sourceKey
      ? lastReadyData
      : null;

  const visibleData = readySnapshotForSource
    ? readySnapshotForSource
    : getSourceKey({ meta: data.source, read: source.read }) === sourceKey
      ? data
      : loadingData;
  const visibleRefreshWarning = warningSourceKey === sourceKey ? refreshWarning : null;

  useEffect(() => {
    let cancelled = false;

    if (!readySnapshotForSource) {
      setData(loadingData);
      setLastReadyData(null);
      setSelectedDocumentId(null);
    }

    setRefreshWarning(null);
    setWarningSourceKey(null);

    void loadData(source).then(
      (nextData) => {
        if (cancelled) {
          return;
        }

        if (nextData.state === "ready") {
          setData(nextData);
          setLastReadyData(nextData);
          setRefreshWarning(null);
          setWarningSourceKey(null);
          setSelectedDocumentId((currentSelectedDocumentId) => selectDocumentId(nextData, currentSelectedDocumentId));
          return;
        }

        setData(nextData);

        if (readySnapshotForSource && nextData.state === "malformed") {
          setRefreshWarning("Dashboard refresh failed. Showing the last loaded data.");
          setWarningSourceKey(sourceKey);
          return;
        }

        setLastReadyData(null);
        setWarningSourceKey(null);
        setSelectedDocumentId(null);
      },
      (error: unknown) => {
        if (cancelled) {
          return;
        }

        if (readySnapshotForSource) {
          setRefreshWarning("Dashboard refresh failed. Showing the last loaded data.");
          setWarningSourceKey(sourceKey);
          return;
        }

        setData(createThrownFailure(source.meta, error));
        setLastReadyData(null);
        setWarningSourceKey(null);
        setSelectedDocumentId(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [refreshToken, sourceKey]);

  return (
    <DashboardShell
      data={visibleData}
      selectedDocumentId={selectedDocumentId}
      selectedNodeId={selectedNodeId}
      onSelectDocument={setSelectedDocumentId}
      onRefresh={() => {
        setRefreshWarning(null);
        setWarningSourceKey(null);
        setRefreshToken((current) => current + 1);
      }}
      refreshWarning={visibleRefreshWarning}
      onRetry={() => {
        setRefreshWarning(null);
        setWarningSourceKey(null);
        setRefreshToken((current) => current + 1);
      }}
    />
  );
}
