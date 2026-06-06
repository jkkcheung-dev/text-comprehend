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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { DocumentNode } from "./graph-nodes/DocumentNode";
import { ConceptNode } from "./graph-nodes/ConceptNode";
import { ArgumentNode } from "./graph-nodes/ArgumentNode";
import { QuestionNode } from "./graph-nodes/QuestionNode";
import type { GraphEdgeRecord, GraphNodeRecord } from "./graph-view-model";
import { validateRenderableGraph } from "./graph-view-model";

const nodeTypes = {
  documentNode: DocumentNode,
  conceptNode: ConceptNode,
  argumentNode: ArgumentNode,
  questionNode: QuestionNode,
};

const EDGE_COLORS: Record<string, string> = {
  contains: "#3F3F46",
  defines: "#6366F1",
  depends_on: "#6366F1",
  exemplifies: "#6366F1",
  supports: "#6366F1",
  contradicts: "#EF4444",
  questions: "#10B981",
};

const EDGE_DASH: Record<string, string> = {
  contains: "",
  defines: "",
  depends_on: "5,5",
  exemplifies: "2,4",
  supports: "",
  contradicts: "5,5",
  questions: "5,5",
};

const ANIMATED_EDGES = new Set(["defines", "depends_on", "contradicts"]);

function toXYFlowNodes(records: GraphNodeRecord[], selectedNodeId: string | null): Node[] {
  return records.map((r) => ({
    id: r.id,
    type: `${r.kind}Node` as keyof typeof nodeTypes,
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
    type: "smoothstep" as const,
    animated: ANIMATED_EDGES.has(e.type),
    style: {
      stroke: EDGE_COLORS[e.type] ?? "#3F3F46",
      strokeDasharray: EDGE_DASH[e.type] ?? "",
    },
    label: e.type,
  }));
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 140, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) {
    g.setNode(node.id, { width: 200, height: 64 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return { ...node, position: { x: pos.x - 100, y: pos.y - 32 } };
  });
}

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
  nodes: rawNodes,
  edges: rawEdges,
  matchedNodeIds,
  selectedNodeId,
  onSelectNode,
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
  }, [rawNodes, rawEdges, selectedNodeId, renderState.state]);

  const initialEdges = useMemo(() => {
    if (renderState.state === "invalid") return [];
    return toXYFlowEdges(rawEdges);
  }, [rawEdges, renderState.state]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (disabled) return;
      onSelectNode(node.id);
    },
    [onSelectNode, disabled],
  );

  if (renderState.state === "invalid") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm gap-1">
        <span className="text-xl opacity-30">⊘</span>
        <span>{rawNodes.length === 0 ? emptyMessage : renderState.message}</span>
        {rawNodes.length === 0 && <span className="text-text-muted text-xs opacity-60">Run /comprehend to generate</span>}
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={disabled ? undefined : onNodesChange}
        onEdgesChange={disabled ? undefined : onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes as any}
        fitView
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
        <Background color="#27272A" gap={20} />
        <Controls className="!bottom-3 !right-3 !z-10" />
        <MiniMap
          nodeColor={(node) => {
            const kind = (node.data as any)?.kind as string;
            if (kind === "document") return "#A1A1AA";
            if (kind === "concept") return "#6366F1";
            if (kind === "argument") return "#F59E0B";
            if (kind === "question") return "#10B981";
            return "#3F3F46";
          }}
          maskColor="rgba(9,9,11,0.08)"
          style={{ background: "#18181B" }}
        />
      </ReactFlow>
    </div>
  );
}
