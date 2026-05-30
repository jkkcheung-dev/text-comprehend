import styles from "./dashboard-shell.module.css";
import { ReactFlowProvider } from "@xyflow/react";
import type { DashboardData, DashboardDocument } from "../data/types";
import { DetailPanelShell, type DetailSelection } from "./detail-panel-shell";
import { FacetToggleGroup } from "./facet-toggle-group";
import { GraphCanvas } from "./graph-canvas";
import {
  buildGraphViewModel,
  createDefaultFacetState,
  validateRenderableGraph,
  type GraphFacetState,
} from "./graph-view-model";
import { SearchControls } from "./search-controls";
import { SourceStatusBadge } from "./source-status-badge";

type GraphViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type DashboardGraph = ReturnType<typeof buildGraphViewModel> & {
  renderMessage?: string;
};

const defaultGraphEmptyMessage = "No graph matches the current search and facet filters.";

function getDocumentButtonLabels(documents: DashboardDocument[]): Map<string, string> {
  const titleCount = new Map<string, number>();

  for (const document of documents) {
    titleCount.set(document.title, (titleCount.get(document.title) ?? 0) + 1);
  }

  return new Map(
    documents.map((document) => [
      document.id,
      (titleCount.get(document.title) ?? 0) > 1 ? `${document.title} (${document.filePath})` : document.title,
    ]),
  );
}

type DashboardShellProps = {
  data: DashboardData;
  searchQuery?: string;
  facets?: GraphFacetState;
  graph?: DashboardGraph | null;
  detailSelection?: DetailSelection | null;
  selectedDocumentId: string | null;
  selectedNodeId: string | null;
  viewState?: GraphViewState;
  onViewStateChange?: (viewState: GraphViewState) => void;
  onSearchQueryChange?: (query: string) => void;
  onResetSearch?: () => void;
  onFacetChange?: (facet: keyof GraphFacetState, nextValue: boolean) => void;
  onSelectDocument: (documentId: string) => void;
  onSelectNode?: (nodeId: string) => void;
  onRefresh?: () => void;
  refreshWarning?: string | null;
  onRetry?: () => void;
};

function getSelectedDocument(
  documents: DashboardDocument[],
  selectedDocumentId: string | null,
  allowFallbackSelection: boolean,
): DashboardDocument | null {
  if (selectedDocumentId) {
    return documents.find((document) => document.id === selectedDocumentId) ?? (allowFallbackSelection ? documents[0] ?? null : null);
  }

  return allowFallbackSelection ? documents[0] ?? null : null;
}

function getVisibleDocuments(
  data: DashboardData,
  graph: DashboardGraph | null,
  graphRenderMessage: string | null,
): DashboardDocument[] {
  if (data.state !== "ready") {
    return [];
  }

  if (!graph) {
    return data.documents;
  }

  if (graphRenderMessage) {
    return data.documents;
  }

  const visibleDocumentIds = new Set(graph.nodes.map((node) => node.documentId));
  return data.documents.filter((document) => visibleDocumentIds.has(document.id));
}

function getDefaultDetailSelection(document: DashboardDocument | null): DetailSelection | null {
  if (!document) {
    return null;
  }

  return { kind: "document", label: document.title, documentTitle: document.title };
}

function getGraphRenderMessage(
  data: DashboardData,
  graph: DashboardGraph | null,
  searchQuery: string,
  facets: GraphFacetState,
): string | null {
  if (data.state !== "ready" || !graph || graph.renderMessage) {
    return graph?.renderMessage ?? null;
  }

  if (searchQuery.trim() !== "" || data.documents.length === 0 || graph.nodes.length > 0) {
    return null;
  }

  const renderState = validateRenderableGraph({
    nodes: graph.nodes,
    visibleEdges: graph.visibleEdges,
    matchedNodeIds: graph.matchedNodeIds,
  });

  return renderState.state === "invalid" ? renderState.message : null;
}

export function DashboardShell({
  data,
  searchQuery = "",
  facets = createDefaultFacetState(),
  graph,
  detailSelection = null,
  selectedDocumentId,
  selectedNodeId,
  viewState,
  onViewStateChange,
  onSearchQueryChange,
  onResetSearch,
  onFacetChange,
  onSelectDocument,
  onSelectNode,
  onRefresh,
  refreshWarning,
  onRetry,
}: DashboardShellProps) {
  const visibleGraph: DashboardGraph | null =
    data.state === "ready" ? (graph ?? buildGraphViewModel(data, { searchQuery, facets })) : null;
  const graphRenderMessage = getGraphRenderMessage(data, visibleGraph, searchQuery, facets);
  const hasSearchControls = Boolean(onSearchQueryChange && onResetSearch);
  const hasFacetControls = Boolean(onFacetChange);
  const hasGraphSelection = Boolean(onSelectNode);
  const showPreviewNotice = data.state === "ready" && (!hasSearchControls || !hasFacetControls || !hasGraphSelection);
  const visibleDocuments = getVisibleDocuments(data, visibleGraph, graphRenderMessage);
  const selectedDocument = getSelectedDocument(visibleDocuments, selectedDocumentId, !hasGraphSelection && !detailSelection);
  const effectiveSelectedDocumentId = selectedDocument?.id ?? null;
  const effectiveDetailSelection = detailSelection ?? getDefaultDetailSelection(selectedDocument);
  const documentButtonLabels = getDocumentButtonLabels(visibleDocuments);
  const graphEmptyMessage = graphRenderMessage ?? defaultGraphEmptyMessage;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.logo}>Text Comprehend</span>
        <SearchControls
          query={searchQuery}
          onQueryChange={onSearchQueryChange ?? (() => {})}
          onReset={onResetSearch ?? (() => {})}
          disabled={!hasSearchControls}
        />
        <span className={styles.headerSpacer} />
        <SourceStatusBadge source={data.source} />
        {data.source.mode === "workspace" && (
          <span className={styles.headerLabel}>{data.source.workspaceRoot}</span>
        )}
        {data.state === "ready" && onRefresh && (
          <button type="button" className={styles.headerRefresh} onClick={onRefresh}>
            Refresh
          </button>
        )}
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h2 className={styles.sidebarTitle}>Documents</h2>
            {data.state === "ready" ? (
              <ul className={styles.documentList}>
                {visibleDocuments.map((document) => (
                  <li key={document.id}>
                    <button
                      type="button"
                      className={styles.documentButton}
                      aria-current={effectiveSelectedDocumentId === document.id ? "true" : undefined}
                      onClick={() => onSelectDocument(document.id)}
                    >
                      {documentButtonLabels.get(document.id) ?? document.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.stateMessage}>Document list unavailable until dashboard data is ready.</p>
            )}
          </div>
          <div className={styles.sidebarSection}>
            <FacetToggleGroup
              facets={facets}
              onFacetChange={onFacetChange ?? (() => {})}
              disabled={!hasFacetControls}
            />
          </div>
          <div className={styles.sidebarFooter}>
            <h2 className={styles.sidebarTitle}>Source</h2>
            <p>{data.source.mode === "fixture" ? data.source.fixtureName : data.source.workspaceRoot}</p>
          </div>
        </aside>

        <div className={styles.mainContent}>
          <div className={styles.graphArea}>
            {refreshWarning && (
              <div className={styles.warningBanner} role="status">
                <span>{refreshWarning}</span>
                {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
              </div>
            )}
            {data.state === "loading" && (
              <p className={styles.stateMessage}>Loading dashboard data...</p>
            )}
            {data.state === "empty" && (
              <p className={styles.stateMessage}>Run /comprehend in your workspace to generate dashboard artifacts.</p>
            )}
            {data.state === "malformed" && (
              <div className={styles.errorAlert} role="alert">
                <p>Dashboard data could not be loaded</p>
                <p>{data.path}</p>
                <p>{data.error}</p>
              </div>
            )}
            {data.state === "ready" && (
              <>
                {onRefresh && (
                  <button type="button" className={styles.refreshButton} onClick={onRefresh}>
                    Refresh data
                  </button>
                )}
                {showPreviewNotice && (
                  <p className={styles.previewNotice}>
                    Search, facet filters, and graph node selection will be available after app wiring lands.
                  </p>
                )}
                {viewState && <p className={styles.zoomIndicator}>Zoom: {viewState.zoom.toFixed(1)}x</p>}
                <ReactFlowProvider>
                  <GraphCanvas
                    nodes={visibleGraph?.nodes ?? []}
                    edges={visibleGraph?.visibleEdges ?? []}
                    matchedNodeIds={visibleGraph?.matchedNodeIds ?? []}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={onSelectNode ?? (() => {})}
                    viewState={viewState}
                    onViewStateChange={onViewStateChange}
                    emptyMessage={graphEmptyMessage}
                    disabled={!hasGraphSelection}
                  />
                </ReactFlowProvider>
              </>
            )}
          </div>
          <div className={styles.detailArea}>
            <DetailPanelShell document={selectedDocument} selectedNodeId={selectedNodeId} selection={effectiveDetailSelection} />
          </div>
        </div>
      </div>
    </div>
  );
}
