import { ReactFlowProvider } from "@xyflow/react";
import type { DashboardData, DashboardDocument } from "../data/types";
import { useDashboardStore } from "../store/dashboard-store";
import { SearchControls } from "./search-controls";
import { FacetToggleGroup } from "./facet-toggle-group";
import { SourceStatusBadge } from "./source-status-badge";
import { GraphCanvas } from "./graph-canvas";
import { DetailPanelShell } from "./detail-panel-shell";
import { buildGraphViewModel, createDefaultFacetState, validateRenderableGraph, type GraphFacetState } from "./graph-view-model";

function getDocumentButtonLabels(documents: DashboardDocument[]): Map<string, string> {
  const titleCount = new Map<string, number>();
  for (const doc of documents) {
    titleCount.set(doc.title, (titleCount.get(doc.title) ?? 0) + 1);
  }
  return new Map(
    documents.map((doc) => [
      doc.id,
      (titleCount.get(doc.title) ?? 0) > 1 ? `${doc.title} (${doc.filePath})` : doc.title,
    ]),
  );
}

export function DashboardShell() {
  const data = useDashboardStore((s) => s.data);
  const searchQuery = useDashboardStore((s) => s.searchQuery);
  const facets = useDashboardStore((s) => s.facets);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const setSearchQuery = useDashboardStore((s) => s.setSearchQuery);
  const toggleFacet = useDashboardStore((s) => s.toggleFacet);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const refresh = useDashboardStore((s) => s.refresh);

  if (!data) return null;

  const isReady = data.state === "ready";
  const graph = isReady
    ? buildGraphViewModel(data, { searchQuery, facets })
    : null;

  const selectedDocument = isReady && selectedNodeId
    ? data.documents.find((d) => d.id === graph?.nodes.find((n) => n.id === selectedNodeId)?.documentId) ?? null
    : isReady ? data.documents[0] ?? null : null;

  const documents = isReady ? data.documents : [];

  return (
    <div className="h-screen flex flex-col bg-surface-canvas">
      {/* Header */}
      <header className="h-12 flex items-center px-4 gap-4 bg-surface-canvas border-b border-border-default shrink-0">
        <span className="font-mono font-bold text-sm text-text-primary whitespace-nowrap">
          Text Comprehend
        </span>
        <SearchControls
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onReset={() => setSearchQuery("")}
        />
        <div className="flex-1" />
        <SourceStatusBadge source={data.source} />
        {data.source.mode === "workspace" && (
          <span className="text-xs text-text-secondary opacity-70 font-mono">{data.source.workspaceRoot}</span>
        )}
        {isReady && (
          <button type="button" onClick={refresh} className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded transition-colors">
            Refresh
          </button>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 bg-surface-panel border-r border-border-default flex flex-col">
          <div className="p-4 border-b border-border-default">
            <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Documents</h2>
            {isReady ? (
              <div className="flex flex-col gap-0.5">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => selectNode(`${encodeURIComponent(doc.id)}:document:${encodeURIComponent(doc.id)}`)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-sm text-text-secondary hover:bg-surface-raised transition-colors truncate ${selectedDocument?.id === doc.id ? "bg-surface-raised text-text-primary font-medium" : ""}`}
                  >
                    {doc.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">
                Document list unavailable until dashboard data is ready.
              </p>
            )}
          </div>
          <div className="p-4 border-b border-border-default">
            <FacetToggleGroup facets={facets} onFacetChange={toggleFacet} />
          </div>
          <div className="mt-auto p-3 border-t border-border-default text-[10px] text-text-muted">
            <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Source</h2>
            <span className="font-mono">{data.source.mode === "fixture" ? data.source.fixtureName : data.source.workspaceRoot}</span>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative border-b border-border-default min-h-0">
            {data.state === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Loading dashboard data...</div>
            )}
            {data.state === "empty" && (
              <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Run /comprehend in your workspace to generate dashboard artifacts.</div>
            )}
            {data.state === "malformed" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-accent-danger text-sm gap-1" role="alert">
                <span>Dashboard data could not be loaded</span>
              </div>
            )}
            {isReady && (
              <ReactFlowProvider>
                <GraphCanvas
                  nodes={graph?.nodes ?? []}
                  edges={graph?.visibleEdges ?? []}
                  matchedNodeIds={graph?.matchedNodeIds ?? []}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={selectNode}
                  emptyMessage="No graph matches the current search and facet filters."
                />
              </ReactFlowProvider>
            )}
          </div>
          <div className="h-[180px] shrink-0 bg-surface-panel">
            <DetailPanelShell
              document={selectedDocument}
              selectedNodeId={selectedNodeId}
              selection={
                selectedDocument
                  ? { kind: "document" as const, label: selectedDocument.title, documentTitle: selectedDocument.title }
                  : null
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
