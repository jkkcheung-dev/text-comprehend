import type { DashboardDocument } from "../data/types";

type DetailPanelShellProps = {
  document: DashboardDocument | null;
  selectedNodeId: string | null;
};

export function DetailPanelShell({ document, selectedNodeId }: DetailPanelShellProps) {
  return (
    <aside>
      <h2>Detail panel</h2>
      <p>{selectedNodeId ? `Selected node: ${selectedNodeId}` : "Selected node: none"}</p>
      {!document ? <p>Select a document to inspect its content.</p> : null}
      {document?.detail.state === "available" ? <pre>{document.detail.simplified.layeredSummary}</pre> : null}
      {document?.detail.state === "degraded" ? (
        <>
          <p>Document detail is unavailable for this artifact.</p>
          <p>{document.detail.path}</p>
          <p>{document.detail.error}</p>
        </>
      ) : null}
    </aside>
  );
}
