import "./styles/reset.css";
import { useEffect, useState } from "react";
import { loadDashboardData } from "./data/load-dashboard-data";
import type { DashboardData, DashboardSource } from "./data/types";
import { DashboardShell } from "./features/dashboard-shell";
import type { DetailSelection } from "./features/detail-panel-shell";
import {
  buildGraphViewModel,
  createDefaultFacetState,
  getSelectedDocumentId,
} from "./features/graph-view-model";

const defaultGraphViewState = { zoom: 1, offsetX: 0, offsetY: 0 };

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

export function App({ source, loadData = loadDashboardData }: AppProps) {
  const sourceKey = getSourceKey(source);
  const loadingData: DashboardData = { state: "loading", source: source.meta };
  const [data, setData] = useState<DashboardData>(loadingData);
  const [lastReadyData, setLastReadyData] = useState<ReadyDashboardData | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [warningSourceKey, setWarningSourceKey] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [facets, setFacets] = useState(createDefaultFacetState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [graphViewState, setGraphViewState] = useState(defaultGraphViewState);

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
      setSearchQuery("");
      setFacets(createDefaultFacetState());
      setSelectedNodeId(null);
      setHasInitializedSelection(false);
      setGraphViewState(defaultGraphViewState);
    }

    setRefreshWarning(null);
    setWarningSourceKey(null);

    try {
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
          setSelectedNodeId(null);
          setHasInitializedSelection(false);
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
          setSelectedNodeId(null);
          setHasInitializedSelection(false);
        },
      );
    } catch (error) {
      if (!cancelled) {
        setData(createThrownFailure(source.meta, error));
        setLastReadyData(null);
        setWarningSourceKey(null);
        setSelectedNodeId(null);
        setHasInitializedSelection(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [refreshToken, sourceKey]);

  const graph = visibleData.state === "ready" ? buildGraphViewModel(visibleData, { searchQuery, facets }) : null;
  const explicitDocumentSelectionId =
    visibleData.state === "ready" ? getExplicitDocumentSelectionId(visibleData, graph, selectedNodeId) : null;
  const effectiveSelectedNodeId = graph?.nodes.some((node) => node.id === selectedNodeId)
    ? selectedNodeId
    : explicitDocumentSelectionId
      ? createDocumentSelectionNodeId(explicitDocumentSelectionId)
    : selectedNodeId === null && !hasInitializedSelection
      ? graph?.nodes[0]?.id ?? null
      : null;
  const selectedDocumentId =
    visibleData.state === "ready" && effectiveSelectedNodeId
      ? getSelectedDocumentId(visibleData, effectiveSelectedNodeId)
      : null;
  const detailSelection =
    visibleData.state === "ready" ? getDetailSelection(visibleData, graph, effectiveSelectedNodeId) : null;

  useEffect(() => {
    if (visibleData.state !== "ready" || !graph) {
      return;
    }

    if (selectedNodeId && graph.nodes.some((node) => node.id === selectedNodeId)) {
      if (!hasInitializedSelection) {
        setHasInitializedSelection(true);
      }
      return;
    }

    if (getExplicitDocumentSelectionId(visibleData, graph, selectedNodeId)) {
      if (!hasInitializedSelection) {
        setHasInitializedSelection(true);
      }
      return;
    }

    if (selectedNodeId === null) {
      if (!hasInitializedSelection) {
        setSelectedNodeId((currentSelectedNodeId) => currentSelectedNodeId ?? (graph.nodes[0]?.id ?? null));
        setHasInitializedSelection(true);
      }
      return;
    }

    setSelectedNodeId(null);
    setHasInitializedSelection(true);
  }, [graph, hasInitializedSelection, selectedNodeId, visibleData]);

  return (
    <DashboardShell
      data={visibleData}
      searchQuery={searchQuery}
      facets={facets}
      graph={graph}
      detailSelection={detailSelection}
      selectedDocumentId={selectedDocumentId}
      selectedNodeId={effectiveSelectedNodeId}
      onSearchQueryChange={setSearchQuery}
      onResetSearch={() => setSearchQuery("")}
      onFacetChange={(facet, nextValue) => {
        setFacets((currentFacets) => ({ ...currentFacets, [facet]: nextValue }));
      }}
      onSelectDocument={(documentId) => {
        setHasInitializedSelection(true);
        setSelectedNodeId(createDocumentSelectionNodeId(documentId));
      }}
      onSelectNode={(nodeId) => {
        setHasInitializedSelection(true);
        setSelectedNodeId(nodeId);
      }}
      onRefresh={() => {
        setRefreshWarning(null);
        setWarningSourceKey(null);
        setRefreshToken((current) => current + 1);
      }}
      refreshWarning={visibleRefreshWarning}
      viewState={graphViewState}
      onViewStateChange={setGraphViewState}
      onRetry={() => {
        setRefreshWarning(null);
        setWarningSourceKey(null);
        setRefreshToken((current) => current + 1);
      }}
    />
  );
}

function createDocumentSelectionNodeId(documentId: string): string {
  return `${encodeURIComponent(documentId)}:document:${encodeURIComponent(documentId)}`;
}

function getExplicitDocumentSelectionId(
  data: ReadyDashboardData,
  graph: ReturnType<typeof buildGraphViewModel> | null,
  selectedNodeId: string | null,
): string | null {
  if (!graph || !selectedNodeId) {
    return null;
  }

  const parts = selectedNodeId.split(":");
  if (parts.length !== 3 || parts[1] !== "document") {
    return null;
  }

  try {
    const documentId = decodeURIComponent(parts[0]);
    const rawId = decodeURIComponent(parts[2]);
    if (documentId !== rawId) {
      return null;
    }

    const hasDocument = data.documents.some((document) => document.id === documentId);
    return hasDocument && graph.nodes.some((node) => node.documentId === documentId) ? documentId : null;
  } catch {
    return null;
  }
}

function getDetailSelection(
  data: ReadyDashboardData,
  graph: ReturnType<typeof buildGraphViewModel> | null,
  selectedNodeId: string | null,
): DetailSelection | null {
  if (!graph || !selectedNodeId) {
    return null;
  }

  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId);
  const explicitDocumentSelectionId = getExplicitDocumentSelectionId(data, graph, selectedNodeId);
  const document = data.documents.find((item) => item.id === (selectedNode?.documentId ?? explicitDocumentSelectionId));
  if (!document) {
    return null;
  }

  if (!selectedNode) {
    return explicitDocumentSelectionId
      ? {
          kind: "document",
          label: document.title,
          documentTitle: document.title,
          filePath: document.filePath,
          fileType: document.fileType,
          lastAnalyzed: document.lastAnalyzed,
        }
      : null;
  }

  if (selectedNode.kind === "document") {
    return {
      kind: "document",
      label: document.title,
      documentTitle: document.title,
      filePath: document.filePath,
      fileType: document.fileType,
      lastAnalyzed: document.lastAnalyzed,
    };
  }

  if (selectedNode.kind === "concept") {
    const concept = document.concepts.find((item) => item.id === selectedNode.rawId);
    return concept
        ? {
            kind: "concept",
            label: concept.name,
            documentTitle: document.title,
            definition: concept.definition,
            importance: concept.importance,
            sourceRefs: concept.sourceRefs,
          }
      : null;
  }

  if (selectedNode.kind === "argument") {
    const argument = document.arguments.find((item) => item.id === selectedNode.rawId);
    return argument
        ? {
            kind: "argument",
            label: argument.claim,
            documentTitle: document.title,
            argumentType: argument.type,
            sourceRefs: argument.sourceRefs,
            evidence: argument.evidence,
            assumptions: argument.assumptions,
            gaps: argument.gaps,
          }
      : null;
  }

  const question = document.questions.find((item) => item.id === selectedNode.rawId);
  return question
    ? {
        kind: "question",
        label: question.question,
        documentTitle: document.title,
        answer: question.answer,
        difficulty: question.difficulty,
        facet: question.facet,
        sourceRefs: question.sourceRefs,
      }
    : null;
}
