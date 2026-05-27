import type { DashboardData, DashboardDocument } from "../data/types";
import { DetailPanelShell, type DetailSelection } from "./detail-panel-shell";
import { FacetToggleGroup } from "./facet-toggle-group";
import { GraphCanvas } from "./graph-canvas";
import {
  buildGraphViewModel,
  createDefaultFacetState,
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
): DashboardDocument[] {
  if (data.state !== "ready") {
    return [];
  }

  if (!graph) {
    return data.documents;
  }

  if (graph.renderMessage) {
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
  const visibleGraph =
    data.state === "ready" ? (graph ?? buildGraphViewModel(data, { searchQuery, facets })) : null;
  const hasSearchControls = Boolean(onSearchQueryChange && onResetSearch);
  const hasFacetControls = Boolean(onFacetChange);
  const hasGraphSelection = Boolean(onSelectNode);
  const showPreviewNotice = data.state === "ready" && (!hasSearchControls || !hasFacetControls || !hasGraphSelection);
  const visibleDocuments = getVisibleDocuments(data, visibleGraph);
  const selectedDocument = getSelectedDocument(visibleDocuments, selectedDocumentId, !hasGraphSelection && !detailSelection);
  const effectiveSelectedDocumentId = selectedDocument?.id ?? null;
  const effectiveDetailSelection = detailSelection ?? getDefaultDetailSelection(selectedDocument);
  const documentButtonLabels = getDocumentButtonLabels(visibleDocuments);

  return (
    <main>
      <header>
        <h1>Text Comprehend</h1>
        <div>
          <SearchControls
            query={searchQuery}
            onQueryChange={onSearchQueryChange ?? (() => {})}
            onReset={onResetSearch ?? (() => {})}
            disabled={!hasSearchControls}
          />
        </div>
        <div>
          <SourceStatusBadge source={data.source} />
          <p>{data.source.label}</p>
        </div>
      </header>

      <section>
        <aside>
          <h2>Documents</h2>
          {data.state === "ready" ? (
            <ul>
              {visibleDocuments.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    aria-current={effectiveSelectedDocumentId === document.id ? "true" : undefined}
                    onClick={() => onSelectDocument(document.id)}
                  >
                    {documentButtonLabels.get(document.id) ?? document.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Document list unavailable until dashboard data is ready.</p>
          )}
          <h2>Facet filters</h2>
          <FacetToggleGroup
            facets={facets}
            onFacetChange={onFacetChange ?? (() => {})}
            disabled={!hasFacetControls}
          />
          <h2>Source details</h2>
          <p>{data.source.mode === "fixture" ? data.source.fixtureName : data.source.workspaceRoot}</p>
        </aside>

        <section>
          <h2>Graph canvas</h2>
          {data.state === "ready" && viewState ? <p>Zoom: {viewState.zoom.toFixed(1)}x</p> : null}
          {showPreviewNotice ? (
            <p>Search, facet filters, and graph node selection will be available after app wiring lands.</p>
          ) : null}
          {refreshWarning ? <p role="status">{refreshWarning}</p> : null}
          {refreshWarning && onRetry ? (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
          {data.state === "loading" ? <p>Loading dashboard data...</p> : null}
          {data.state === "empty" ? <p>Run /comprehend in your workspace to generate dashboard artifacts.</p> : null}
          {data.state === "malformed" ? (
            <div role="alert">
              <p>Dashboard data could not be loaded</p>
              <p>{data.path}</p>
              <p>{data.error}</p>
            </div>
          ) : null}
          {data.state === "ready" ? (
            <>
              {onRefresh ? (
                <button type="button" onClick={onRefresh}>
                  Refresh data
                </button>
              ) : null}
              <GraphCanvas
                nodes={visibleGraph?.nodes ?? []}
                edges={visibleGraph?.visibleEdges ?? []}
                matchedNodeIds={visibleGraph?.matchedNodeIds ?? []}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode ?? (() => {})}
                viewState={viewState}
                onViewStateChange={onViewStateChange}
                emptyMessage={visibleGraph?.renderMessage ?? "No graph matches the current search and facet filters."}
                disabled={!hasGraphSelection}
              />
            </>
          ) : null}
        </section>
      </section>

      <DetailPanelShell document={selectedDocument} selectedNodeId={selectedNodeId} selection={effectiveDetailSelection} />
    </main>
  );
}
