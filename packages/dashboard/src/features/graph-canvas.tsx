import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { DocumentNode } from "./graph-nodes/DocumentNode";
import { ConceptNode } from "./graph-nodes/ConceptNode";
import { ArgumentNode } from "./graph-nodes/ArgumentNode";
import { QuestionNode } from "./graph-nodes/QuestionNode";
import type { GraphEdgeRecord, GraphNodeRecord } from "./graph-view-model";
import { validateRenderableGraph } from "./graph-view-model";
import styles from "./graph-canvas.module.css";

const nodeTypes = {
  documentNode: DocumentNode,
  conceptNode: ConceptNode,
  argumentNode: ArgumentNode,
  questionNode: QuestionNode,
};

const EDGE_COLORS: Record<string, string> = {
  contains: "#94A3B8",
  defines: "#7C3AED",
  depends_on: "#7C3AED",
  exemplifies: "#7C3AED",
  supports: "#F59E0B",
  contradicts: "#EF4444",
  questions: "#10B981",
};

const EDGE_DASH: Record<string, string> = {
  contains: "",
  defines: "",
  depends_on: "5,5",
  exemplifies: "2,4",
  supports: "",
  contradicts: "",
  questions: "5,5",
};

const ANIMATED_EDGES = new Set(["defines", "depends_on", "contradicts"]);

function toXYFlowNodes(records: GraphNodeRecord[], selectedNodeId: string | null): Node[] {
  return records.map((r) => ({
    id: r.id,
    type: `${r.kind}Node`,
    position: { x: 0, y: 0 },
    data: { label: r.label, kind: r.kind, documentId: r.documentId },
    selected: r.id === selectedNodeId,
  }));
}

function toXYFlowEdges(records: GraphEdgeRecord[]): Edge[] {
  return records.map((e) => ({
    id: `${e.source}:${e.target}:${e.type}`,
    source: e.source,
    target: e.target,
    type: "smoothstep" as ConnectionLineType,
    animated: ANIMATED_EDGES.has(e.type),
    style: {
      stroke: EDGE_COLORS[e.type] ?? "#94A3B8",
      strokeDasharray: EDGE_DASH[e.type] ?? "",
    },
    label: e.type,
  }));
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) {
    g.setNode(node.id, { width: 200, height: 56 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: { x: pos.x - 100, y: pos.y - 28 },
    };
  });
}

type GraphCanvasViewState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
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
  nodes: rawNodes,
  edges: rawEdges,
  matchedNodeIds,
  selectedNodeId,
  onSelectNode,
  viewState,
  onViewStateChange,
  emptyMessage,
  disabled = false,
}: GraphCanvasProps) {
  const renderState = validateRenderableGraph({
    nodes: rawNodes,
    visibleEdges: rawEdges,
    matchedNodeIds,
  });

  const initialNodes = useMemo(() => {
    if (renderState.state === "invalid") return [];
    const xyflowNodes = toXYFlowNodes(rawNodes, selectedNodeId);
    const xyflowEdges = toXYFlowEdges(rawEdges);
    return applyDagreLayout(xyflowNodes, xyflowEdges);
  }, [rawNodes, rawEdges, renderState.state, selectedNodeId]);

  const initialEdges = useMemo(() => {
    if (renderState.state === "invalid") return [];
    return toXYFlowEdges(rawEdges);
  }, [rawEdges, renderState.state]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (disabled) return;
      onSelectNode(node.id);
    },
    [onSelectNode, disabled],
  );

  const onMoveEnd = useCallback(
    (_event: any, viewport: any) => {
      onViewStateChange?.({
        zoom: Math.round(viewport.zoom * 10) / 10,
        offsetX: viewport.x,
        offsetY: viewport.y,
      });
    },
    [onViewStateChange],
  );

  const defaultViewport = viewState
    ? { x: viewState.offsetX, y: viewState.offsetY, zoom: viewState.zoom }
    : undefined;

  if (renderState.state === "invalid") {
    return <p className={styles.emptyMessage}>{rawNodes.length === 0 ? emptyMessage : renderState.message}</p>;
  }

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={disabled ? undefined : onNodesChange}
        onEdgesChange={disabled ? undefined : onEdgesChange}
        onNodeClick={onNodeClick}
        onMoveEnd={onViewStateChange ? onMoveEnd : undefined}
        defaultViewport={defaultViewport}
        nodeTypes={nodeTypes as any}
        fitView={!viewState}
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={!disabled}
        nodesConnectable={false}
        elementsSelectable={!disabled}
        panOnDrag={!disabled}
        zoomOnScroll={!disabled}
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E2E8F0" gap={20} />
        <Controls className={styles.controls} />
        <MiniMap
          nodeColor={(node) => {
            const kind = (node.data as any)?.kind as string | undefined;
            if (kind === "document") return "#1E40AF";
            if (kind === "concept") return "#7C3AED";
            if (kind === "argument") return "#F59E0B";
            if (kind === "question") return "#10B981";
            return "#94A3B8";
          }}
          maskColor="rgba(30, 64, 175, 0.08)"
          style={{ background: "#F1F5F9" }}
        />
      </ReactFlow>
    </div>
  );
}
