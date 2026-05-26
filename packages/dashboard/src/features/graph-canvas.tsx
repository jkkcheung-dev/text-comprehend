import type { GraphEdgeRecord, GraphNodeRecord } from "./graph-view-model";

type GraphCanvasProps = {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  matchedNodeIds: string[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  emptyMessage: string;
  disabled?: boolean;
};

export function GraphCanvas({
  nodes,
  edges,
  matchedNodeIds,
  selectedNodeId,
  onSelectNode,
  emptyMessage,
  disabled = false,
}: GraphCanvasProps) {
  if (nodes.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  const getCountKey = (...parts: string[]) => JSON.stringify(parts);
  const matchedNodeIdSet = new Set(matchedNodeIds);
  const nodeCountByLabel = new Map<string, number>();
  const nodeCountByDocumentLabel = new Map<string, number>();
  const nodeCountByDocumentLabelAndRawId = new Map<string, number>();

  for (const node of nodes) {
    nodeCountByLabel.set(node.label, (nodeCountByLabel.get(node.label) ?? 0) + 1);
    const documentLabelKey = getCountKey(node.label, node.documentId);
    nodeCountByDocumentLabel.set(documentLabelKey, (nodeCountByDocumentLabel.get(documentLabelKey) ?? 0) + 1);
    const documentLabelAndRawIdKey = getCountKey(node.label, node.documentId, node.rawId);
    nodeCountByDocumentLabelAndRawId.set(
      documentLabelAndRawIdKey,
      (nodeCountByDocumentLabelAndRawId.get(documentLabelAndRawIdKey) ?? 0) + 1,
    );
  }

  const getNodeDisplayLabel = (node: GraphNodeRecord) => {
    if ((nodeCountByLabel.get(node.label) ?? 0) <= 1) {
      return node.label;
    }

    const documentLabel = `${node.label} (${node.documentId})`;
    const documentLabelKey = getCountKey(node.label, node.documentId);
    const documentLabelAndRawId = `${documentLabel}:${node.rawId}`;
    const documentLabelAndRawIdKey = getCountKey(node.label, node.documentId, node.rawId);

    return (nodeCountByDocumentLabel.get(documentLabelKey) ?? 0) > 1
      ? (nodeCountByDocumentLabelAndRawId.get(documentLabelAndRawIdKey) ?? 0) > 1
        ? `${documentLabelAndRawId}:${node.kind}`
        : documentLabelAndRawId
      : documentLabel;
  };

  const nodeLabelsById = new Map(nodes.map((node) => [node.id, getNodeDisplayLabel(node)]));

  return (
    <section aria-label="Graph canvas">
      <p>{edges.length} edges visible</p>
      {edges.length > 0 ? (
        <ul aria-label="Visible edges">
          {edges.map((edge) => {
            const sourceLabel = nodeLabelsById.get(edge.source) ?? edge.source;
            const targetLabel = nodeLabelsById.get(edge.target) ?? edge.target;

            return (
              <li key={`${edge.source}:${edge.target}:${edge.type}:${edge.rawSource}:${edge.rawTarget}`}>
                {sourceLabel} -&gt; {targetLabel} ({edge.type})
              </li>
            );
          })}
        </ul>
      ) : null}
      <ul>
        {nodes.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              aria-label={`Select graph node ${getNodeDisplayLabel(node)}`}
              aria-current={selectedNodeId === node.id ? "true" : undefined}
              disabled={disabled}
              onClick={() => onSelectNode(node.id)}
            >
              {getNodeDisplayLabel(node)}
            </button>
            {matchedNodeIdSet.has(node.id) ? <span> Match</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
