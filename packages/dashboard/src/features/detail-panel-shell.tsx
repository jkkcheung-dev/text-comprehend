import type { Evidence, SourceRef } from "@text-comprehend/core";
import type { DashboardDocument } from "../data/types";

export type DetailSelection =
  | {
      kind: "document";
      label: string;
      documentTitle: string;
      filePath?: string;
      fileType?: DashboardDocument["fileType"];
      lastAnalyzed?: string;
    }
  | {
      kind: "concept";
      label: string;
      documentTitle: string;
      definition: string;
      importance: string;
      sourceRefs?: SourceRef[];
    }
  | {
      kind: "argument";
      label: string;
      documentTitle: string;
      argumentType: string;
      sourceRefs?: SourceRef[];
      evidence?: Evidence[];
      assumptions: string[];
      gaps: string[];
    }
  | {
      kind: "question";
      label: string;
      documentTitle: string;
      answer: string;
      difficulty: string;
      facet: string;
      sourceRefs?: SourceRef[];
    };

type DetailPanelShellProps = {
  document: DashboardDocument | null;
  selectedNodeId: string | null;
  selection: DetailSelection | null;
};

export function DetailPanelShell({ document, selectedNodeId, selection }: DetailPanelShellProps) {
  return (
    <aside>
      <h2>Detail panel</h2>
      <p>{selectedNodeId ? `Selected node: ${selectedNodeId}` : "Selected node: none"}</p>
      {!document ? <p>Select a document to inspect its content.</p> : null}
      {selection ? <p>Node type: {selection.kind}</p> : null}

      {selection?.kind === "concept" ? (
        <>
          <h3>{selection.label}</h3>
          <p>{selection.definition}</p>
          <p>Importance: {selection.importance}</p>
          <p>Document: {selection.documentTitle}</p>
          <SourceReferenceList sourceRefs={selection.sourceRefs} />
        </>
      ) : null}

      {selection?.kind === "argument" ? (
        <>
          <h3>{selection.label}</h3>
          <p>Type: {selection.argumentType}</p>
          <p>Document: {selection.documentTitle}</p>
          {selection.evidence?.length ? <p>Evidence items: {selection.evidence.length}</p> : null}
          {selection.evidence?.map((item, index) => (
            <p key={`${item.type}:${item.strength}:${index}`}>
              {item.type} ({item.strength}): {item.content}
            </p>
          ))}
          <SourceReferenceList sourceRefs={selection.sourceRefs} />
          {selection.assumptions.length > 0 ? <p>{selection.assumptions.join(", ")}</p> : null}
          {selection.gaps.length > 0 ? <p>{selection.gaps.join(", ")}</p> : null}
        </>
      ) : null}

      {selection?.kind === "question" ? (
        <>
          <h3>{selection.label}</h3>
          <p>Answer: {selection.answer}</p>
          <p>Difficulty: {selection.difficulty}</p>
          <p>Facet: {selection.facet}</p>
          <p>Document: {selection.documentTitle}</p>
          <SourceReferenceList sourceRefs={selection.sourceRefs} />
        </>
      ) : null}

      {selection?.kind === "document" && document ? (
        <>
          <h3>{selection.label}</h3>
          {selection.filePath ? <p>File path: {selection.filePath}</p> : null}
          {selection.fileType ? <p>File type: {selection.fileType}</p> : null}
          {selection.lastAnalyzed ? <p>Last analyzed: {selection.lastAnalyzed}</p> : null}
        </>
      ) : null}
      {selection?.kind === "document" && document?.detail.state === "available" ? (
        <pre>{document.detail.simplified.layeredSummary}</pre>
      ) : null}
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

function SourceReferenceList({ sourceRefs }: { sourceRefs?: SourceRef[] }) {
  if (!sourceRefs?.length) {
    return null;
  }

  return sourceRefs.map((sourceRef, index) => (
    <p key={`${sourceRef.documentId}:${sourceRef.startLine}:${sourceRef.endLine}:${index}`}>
      {sourceRef.documentId} lines {sourceRef.startLine}-{sourceRef.endLine}: {sourceRef.excerpt}
    </p>
  ));
}
