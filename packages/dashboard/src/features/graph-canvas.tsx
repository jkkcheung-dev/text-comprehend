import {
  getNodeLabelMode,
  getZoomBucket,
  validateRenderableGraph,
  type GraphEdgeRecord,
  type GraphNodeRecord,
} from "./graph-view-model";

type GraphCanvasViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const defaultViewState: GraphCanvasViewState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

type GraphCanvasProps = {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  matchedNodeIds: string[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  viewState?: GraphCanvasViewState;
  onViewStateChange?: (viewState: GraphCanvasViewState) => void;
  emptyMessage: string;
  disabled?: boolean;
};

export function GraphCanvas({
  nodes,
  edges,
  matchedNodeIds,
  selectedNodeId,
  onSelectNode,
  viewState = defaultViewState,
  onViewStateChange,
  emptyMessage,
  disabled = false,
}: GraphCanvasProps) {
  const renderState = validateRenderableGraph({ nodes, visibleEdges: edges, matchedNodeIds });
  if (renderState.state === "invalid") {
    return <p>{nodes.length === 0 ? emptyMessage : renderState.message}</p>;
  }

  const getCountKey = (...parts: string[]) => JSON.stringify(parts);
  const matchedNodeIdSet = new Set(matchedNodeIds);
  const zoomBucket = getZoomBucket(viewState.zoom);
  const labelMode = getNodeLabelMode(zoomBucket);
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
  const getRenderedNodeLabel = (node: GraphNodeRecord) => {
    if (labelMode === "minimal") {
      return node.kind;
    }

    return labelMode === "detailed" ? `${node.label} (${node.kind})` : node.label;
  };
  const hasViewStateHandler = typeof onViewStateChange === "function";
  const zoomedViewStyle = {
    transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.zoom})`,
    transformOrigin: "top left",
  } as const;

  return (
    <section aria-label="Graph canvas">
      <div>
        <button
          type="button"
          onClick={() =>
            onViewStateChange?.({
              ...viewState,
              zoom: Math.min(viewState.zoom + 0.2, 2),
            })
          }
          disabled={disabled || !hasViewStateHandler}
        >
          Zoom in
        </button>
        <button
          type="button"
          onClick={() =>
            onViewStateChange?.({
              ...viewState,
              zoom: Math.max(viewState.zoom - 0.2, 0.6),
            })
          }
          disabled={disabled || !hasViewStateHandler}
        >
          Zoom out
        </button>
      </div>
      <div style={zoomedViewStyle}>
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
              {getRenderedNodeLabel(node)}
            </button>
            {matchedNodeIdSet.has(node.id) ? <span> Match</span> : null}
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
