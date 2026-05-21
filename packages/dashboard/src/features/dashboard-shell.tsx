import type { DashboardData, DashboardDocument } from "../data/types";
import { DetailPanelShell } from "./detail-panel-shell";
import { SourceStatusBadge } from "./source-status-badge";

type DashboardShellProps = {
  data: DashboardData;
  selectedDocumentId: string | null;
  selectedNodeId: string | null;
  onSelectDocument: (documentId: string) => void;
};

function getSelectedDocument(data: DashboardData, selectedDocumentId: string | null): DashboardDocument | null {
  if (data.state !== "ready") {
    return null;
  }

  return data.documents.find((document) => document.id === selectedDocumentId) ?? data.documents[0] ?? null;
}

export function DashboardShell({
  data,
  selectedDocumentId,
  selectedNodeId,
  onSelectDocument,
}: DashboardShellProps) {
  const selectedDocument = getSelectedDocument(data, selectedDocumentId);

  return (
    <main>
      <header>
        <h1>Text Comprehend</h1>
        <div>
          <p>Search (coming soon)</p>
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
              {data.documents.map((document) => (
                <li key={document.id}>
                  <button type="button" onClick={() => onSelectDocument(document.id)}>
                    {document.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Document list unavailable until dashboard data is ready.</p>
          )}
          <h2>Facet filters</h2>
          <p>Facet filters (coming soon)</p>
          <h2>Source details</h2>
          <p>{data.source.mode === "fixture" ? data.source.fixtureName : data.source.workspaceRoot}</p>
        </aside>

        <section>
          <h2>Graph canvas</h2>
          {data.state === "loading" ? <p>Loading dashboard data...</p> : null}
          {data.state === "empty" ? <p>Run /comprehend in your workspace to generate dashboard artifacts.</p> : null}
          {data.state === "malformed" ? (
            <>
              <p>Dashboard data could not be loaded</p>
              <p>{data.path}</p>
              <p>{data.error}</p>
            </>
          ) : null}
          {data.state === "ready" ? <p>Graph view available when data is ready.</p> : null}
        </section>
      </section>

      <DetailPanelShell document={selectedDocument} selectedNodeId={selectedNodeId} />
    </main>
  );
}
