import type { Edge } from "@text-comprehend/core";
import type { DashboardDocument, ReadyDashboardData } from "../data/types";

export type GraphFacetState = {
  documents: boolean;
  concepts: boolean;
  arguments: boolean;
  questions: boolean;
};

export type GraphNodeRecord = {
  id: string;
  rawId: string;
  kind: "document" | "concept" | "argument" | "question";
  label: string;
  searchText: string;
  documentId: string;
  dimmed: boolean;
  highlighted: boolean;
};

export type GraphEdgeRecord = Edge & {
  source: string;
  target: string;
  rawSource: string;
  rawTarget: string;
};

export type GraphZoomBucket = "far" | "mid" | "near";

export function createDefaultFacetState(): GraphFacetState {
  return { documents: true, concepts: true, arguments: true, questions: true };
}

export function getZoomBucket(zoom: number): GraphZoomBucket {
  if (zoom < 0.85) return "far";
  if (zoom > 1.4) return "near";
  return "mid";
}

export function getNodeLabelMode(bucket: GraphZoomBucket): "minimal" | "standard" | "detailed" {
  if (bucket === "far") return "minimal";
  if (bucket === "near") return "detailed";
  return "standard";
}

export function validateRenderableGraph(model: {
  nodes: unknown[];
  visibleEdges: unknown[];
  matchedNodeIds: string[];
}) {
  // Phase 2 only guards the empty-node fallback; other render checks stay with callers.
  return model.nodes.length === 0
    ? { state: "invalid" as const, message: "Graph view unavailable for the current selection." }
    : { state: "valid" as const };
}

export function buildGraphViewModel(
  data: ReadyDashboardData,
  options: { searchQuery: string; facets: GraphFacetState },
): {
  nodes: GraphNodeRecord[];
  matchedNodeIds: string[];
  visibleEdges: GraphEdgeRecord[];
} {
  const nodes = data.documents.flatMap((document) => flattenDocument(document, options.facets));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const nodesByRawId = groupNodesByRawId(nodes);
  const nodesByDocumentAndRawId = groupNodesByDocumentAndRawId(nodes);
  const relationshipEdgeOwners = resolveRelationshipEdgeOwners(
    data.graph.edges,
    nodesByRawId,
    nodesByDocumentAndRawId,
  );
  const normalizedQuery = options.searchQuery.trim().toLowerCase();
  const matchedNodeIds = normalizedQuery
    ? nodes.filter((node) => node.searchText.includes(normalizedQuery)).map((node) => node.id)
    : [];
  const visibleNodeIds = normalizedQuery
    ? getSearchWorkingSet(
        matchedNodeIds,
        data.graph.edges,
        nodesById,
        nodesByDocumentAndRawId,
        relationshipEdgeOwners,
      )
    : new Set(nodes.map((node) => node.id));
  const allNodes = nodes.map((node) => ({
    ...node,
    dimmed: normalizedQuery !== "" && !matchedNodeIds.includes(node.id),
    highlighted: normalizedQuery !== "" && matchedNodeIds.includes(node.id),
  }));
  const visibleEdges = buildVisibleEdges(
    data.graph.edges,
    visibleNodeIds,
    nodesByRawId,
    nodesByDocumentAndRawId,
    relationshipEdgeOwners,
  );

  return { nodes: allNodes, matchedNodeIds, visibleEdges };
}

export function getSelectedDocumentId(
  data: ReadyDashboardData,
  selectedNodeId: string | null,
): string | null {
  if (!selectedNodeId) {
    return data.documents[0]?.id ?? null;
  }

  const scopedNodeId = parseScopedNodeId(selectedNodeId);
  if (scopedNodeId) {
    const selectedDocument = data.documents.find((document) => document.id === scopedNodeId.documentId);
    if (!selectedDocument) {
      return data.documents[0]?.id ?? null;
    }

    if (scopedNodeId.kind === "document") {
      return selectedDocument.id;
    }

    if (hasScopedNode(selectedDocument, scopedNodeId.kind, scopedNodeId.rawId)) {
      return selectedDocument.id;
    }
  }

  for (const document of data.documents) {
    if (document.id === selectedNodeId) {
      return document.id;
    }
    if (document.concepts.some((concept) => concept.id === selectedNodeId)) {
      return document.id;
    }
    if (document.arguments.some((argument) => argument.id === selectedNodeId)) {
      return document.id;
    }
    if (document.questions.some((question) => question.id === selectedNodeId)) {
      return document.id;
    }
  }

  return data.documents[0]?.id ?? null;
}

function flattenDocument(document: DashboardDocument, facets: GraphFacetState): GraphNodeRecord[] {
  const nodes: GraphNodeRecord[] = [];

  if (facets.documents) {
    nodes.push({
      id: createScopedNodeId(document.id, "document", document.id),
      rawId: document.id,
      kind: "document",
      label: document.title,
      searchText: `${document.title} ${document.filePath}`.toLowerCase(),
      documentId: document.id,
      dimmed: false,
      highlighted: false,
    });
  }

  if (facets.concepts) {
    nodes.push(
      ...document.concepts.map((concept) => ({
        id: createScopedNodeId(document.id, "concept", concept.id),
        rawId: concept.id,
        kind: "concept" as const,
        label: concept.name,
        searchText: `${concept.name} ${concept.definition}`.toLowerCase(),
        documentId: document.id,
        dimmed: false,
        highlighted: false,
      })),
    );
  }

  if (facets.arguments) {
    nodes.push(
      ...document.arguments.map((argument) => ({
        id: createScopedNodeId(document.id, "argument", argument.id),
        rawId: argument.id,
        kind: "argument" as const,
        label: argument.claim,
        searchText: `${argument.claim} ${argument.assumptions.join(" ")} ${argument.gaps.join(" ")}`.toLowerCase(),
        documentId: document.id,
        dimmed: false,
        highlighted: false,
      })),
    );
  }

  if (facets.questions) {
    nodes.push(
      ...document.questions.map((question) => ({
        id: createScopedNodeId(document.id, "question", question.id),
        rawId: question.id,
        kind: "question" as const,
        label: question.question,
        searchText: `${question.question} ${question.answer}`.toLowerCase(),
        documentId: document.id,
        dimmed: false,
        highlighted: false,
      })),
    );
  }

  return nodes;
}

function groupNodesByRawId(nodes: GraphNodeRecord[]): Map<string, GraphNodeRecord[]> {
  const nodesById = new Map<string, GraphNodeRecord[]>();

  for (const node of nodes) {
    const existing = nodesById.get(node.rawId);
    if (existing) {
      existing.push(node);
      continue;
    }

    nodesById.set(node.rawId, [node]);
  }

  return nodesById;
}

function groupNodesByDocumentAndRawId(nodes: GraphNodeRecord[]): Map<string, GraphNodeRecord[]> {
  const nodesById = new Map<string, GraphNodeRecord[]>();

  for (const node of nodes) {
    const key = getDocumentRawIdKey(node.documentId, node.rawId);
    const existing = nodesById.get(key);
    if (existing) {
      existing.push(node);
      continue;
    }

    nodesById.set(key, [node]);
  }

  return nodesById;
}

function getSearchWorkingSet(
  matchedNodeIds: string[],
  edges: Edge[],
  nodesById: Map<string, GraphNodeRecord>,
  nodesByDocumentAndRawId: Map<string, GraphNodeRecord[]>,
  relationshipEdgeOwners: Map<Edge, Set<string>>,
): Set<string> {
  const visibleNodeIds = new Set<string>();
  const matchedNodeIdSet = new Set(matchedNodeIds);

  for (const matchedNodeId of matchedNodeIdSet) {
    const matchedNode = nodesById.get(matchedNodeId);
    if (!matchedNode) {
      continue;
    }

    addSearchContextNodes(
      matchedNode.documentId,
      matchedNode.rawId,
      visibleNodeIds,
      nodesByDocumentAndRawId,
      [matchedNode.kind],
    );

    for (const edge of edges) {
      if (!isEdgeAvailableInDocument(edge, matchedNode.documentId, relationshipEdgeOwners)) {
        continue;
      }

      if (edge.source === matchedNode.rawId) {
        const targetKinds = getEdgeTargetKinds(edge, matchedNode.kind);
        if (targetKinds.length > 0) {
          addSearchContextNodes(
            matchedNode.documentId,
            edge.target,
            visibleNodeIds,
            nodesByDocumentAndRawId,
            targetKinds,
          );
        }
      }
      if (edge.target === matchedNode.rawId) {
        const sourceKinds = getEdgeSourceKinds(edge, matchedNode.kind);
        if (sourceKinds.length > 0) {
          addSearchContextNodes(
            matchedNode.documentId,
            edge.source,
            visibleNodeIds,
            nodesByDocumentAndRawId,
            sourceKinds,
          );
        }
      }
    }
  }

  return visibleNodeIds;
}

function addSearchContextNodes(
  documentId: string,
  rawId: string,
  visibleNodeIds: Set<string>,
  nodesByDocumentAndRawId: Map<string, GraphNodeRecord[]>,
  kinds: GraphNodeRecord["kind"][],
): void {
  const nodes = nodesByDocumentAndRawId.get(getDocumentRawIdKey(documentId, rawId));
  if (!nodes) {
    return;
  }

  for (const node of nodes) {
    if (!kinds.includes(node.kind)) {
      continue;
    }

    visibleNodeIds.add(node.id);

    if (node.kind !== "document") {
      const documentNodes = nodesByDocumentAndRawId.get(getDocumentRawIdKey(node.documentId, node.documentId)) ?? [];
      for (const documentNode of documentNodes) {
        if (documentNode.kind === "document") {
          visibleNodeIds.add(documentNode.id);
        }
      }
    }
  }
}

function isVisibleEdge(
  edge: Edge,
  visibleNodeIds: Set<string>,
  nodesByRawId: Map<string, GraphNodeRecord[]>,
  nodesByDocumentAndRawId: Map<string, GraphNodeRecord[]>,
  relationshipEdgeOwners: Map<Edge, Set<string>>,
): boolean {
  const sourceNodes = nodesByRawId.get(edge.source) ?? [];
  const relationshipOwnerDocumentIds = relationshipEdgeOwners.get(edge);

  if (isRelationshipEdge(edge) && !relationshipOwnerDocumentIds) {
    return false;
  }

  for (const sourceNode of sourceNodes) {
    if (relationshipOwnerDocumentIds && !relationshipOwnerDocumentIds.has(sourceNode.documentId)) {
      continue;
    }

    if (!visibleNodeIds.has(sourceNode.id)) {
      continue;
    }

     const targetKinds = getEdgeTargetKinds(edge, sourceNode.kind);
     if (targetKinds.length === 0) {
       continue;
     }

    const targetNodes =
      nodesByDocumentAndRawId.get(getDocumentRawIdKey(sourceNode.documentId, edge.target)) ?? [];
    if (
      targetNodes.some(
        (targetNode) => targetKinds.includes(targetNode.kind) && visibleNodeIds.has(targetNode.id),
      )
    ) {
      return true;
    }
  }

  return false;
}

function buildVisibleEdges(
  edges: Edge[],
  visibleNodeIds: Set<string>,
  nodesByRawId: Map<string, GraphNodeRecord[]>,
  nodesByDocumentAndRawId: Map<string, GraphNodeRecord[]>,
  relationshipEdgeOwners: Map<Edge, Set<string>>,
): GraphEdgeRecord[] {
  const visibleEdges: GraphEdgeRecord[] = [];
  const seenEdgeKeys = new Set<string>();

  for (const edge of edges) {
    const relationshipOwnerDocumentIds = relationshipEdgeOwners.get(edge);

    if (isRelationshipEdge(edge) && !relationshipOwnerDocumentIds) {
      continue;
    }

    for (const sourceNode of nodesByRawId.get(edge.source) ?? []) {
      if (relationshipOwnerDocumentIds && !relationshipOwnerDocumentIds.has(sourceNode.documentId)) {
        continue;
      }

      if (!visibleNodeIds.has(sourceNode.id)) {
        continue;
      }

      const targetKinds = getEdgeTargetKinds(edge, sourceNode.kind);
      if (targetKinds.length === 0) {
        continue;
      }

      const targetNodes = nodesByDocumentAndRawId.get(getDocumentRawIdKey(sourceNode.documentId, edge.target)) ?? [];
      for (const targetNode of targetNodes) {
        if (!targetKinds.includes(targetNode.kind) || !visibleNodeIds.has(targetNode.id)) {
          continue;
        }

        const scopedEdge: GraphEdgeRecord = {
          ...edge,
          source: sourceNode.id,
          target: targetNode.id,
          rawSource: edge.source,
          rawTarget: edge.target,
        };
        const scopedEdgeKey = `${scopedEdge.source}:${scopedEdge.target}:${scopedEdge.type}:${scopedEdge.rawSource}:${scopedEdge.rawTarget}`;
        if (seenEdgeKeys.has(scopedEdgeKey)) {
          continue;
        }

        seenEdgeKeys.add(scopedEdgeKey);
        visibleEdges.push(scopedEdge);
      }
    }
  }

  return visibleEdges;
}

function resolveRelationshipEdgeOwners(
  edges: Edge[],
  nodesByRawId: Map<string, GraphNodeRecord[]>,
  nodesByDocumentAndRawId: Map<string, GraphNodeRecord[]>,
): Map<Edge, Set<string>> {
  const owners = new Map<Edge, Set<string>>();

  for (const edge of edges) {
    if (!isRelationshipEdge(edge)) {
      continue;
    }

    const candidateDocumentIds = new Set<string>();

    for (const sourceNode of nodesByRawId.get(edge.source) ?? []) {
      const targetKinds = getEdgeTargetKinds(edge, sourceNode.kind);
      if (targetKinds.length === 0) {
        continue;
      }

      const targetNodes =
        nodesByDocumentAndRawId.get(getDocumentRawIdKey(sourceNode.documentId, edge.target)) ?? [];
      if (targetNodes.some((targetNode) => targetKinds.includes(targetNode.kind))) {
        candidateDocumentIds.add(sourceNode.documentId);
      }
    }

    if (candidateDocumentIds.size > 0) {
      owners.set(edge, candidateDocumentIds);
    }
  }

  return owners;
}

function isEdgeAvailableInDocument(
  edge: Edge,
  documentId: string,
  relationshipEdgeOwners: Map<Edge, Set<string>>,
): boolean {
  if (!isRelationshipEdge(edge)) {
    return true;
  }

  return relationshipEdgeOwners.get(edge)?.has(documentId) ?? false;
}

function isRelationshipEdge(edge: Edge): boolean {
  return edge.type !== "contains" && edge.type !== "questions";
}

function getEdgeTargetKinds(
  edge: Edge,
  sourceKind: GraphNodeRecord["kind"],
): GraphNodeRecord["kind"][] {
  switch (edge.type) {
    case "contains":
      return sourceKind === "document" ? ["concept", "argument", "question"] : [];
    case "questions":
      return sourceKind === "question" ? ["document"] : [];
    case "defines":
    case "depends_on":
    case "exemplifies":
      return sourceKind === "concept" ? ["concept"] : [];
    case "supports":
    case "contradicts":
      return sourceKind === "concept" || sourceKind === "argument" ? [sourceKind] : [];
  }
}

function getEdgeSourceKinds(
  edge: Edge,
  targetKind: GraphNodeRecord["kind"],
): GraphNodeRecord["kind"][] {
  switch (edge.type) {
    case "contains":
      return targetKind === "concept" || targetKind === "argument" || targetKind === "question"
        ? ["document"]
        : [];
    case "questions":
      return targetKind === "document" ? ["question"] : [];
    case "defines":
    case "depends_on":
    case "exemplifies":
      return targetKind === "concept" ? ["concept"] : [];
    case "supports":
    case "contradicts":
      return targetKind === "concept" || targetKind === "argument" ? [targetKind] : [];
  }
}

function createScopedNodeId(
  documentId: string,
  kind: GraphNodeRecord["kind"],
  rawId: string,
): string {
  return `${encodeIdentityPart(documentId)}:${kind}:${encodeIdentityPart(rawId)}`;
}

function parseScopedNodeId(nodeId: string): {
  documentId: string;
  kind: GraphNodeRecord["kind"];
  rawId: string;
} | null {
  const parts = nodeId.split(":");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedDocumentId, kind, encodedRawId] = parts;
  if (kind !== "document" && kind !== "concept" && kind !== "argument" && kind !== "question") {
    return null;
  }

  try {
    return {
      documentId: decodeIdentityPart(encodedDocumentId),
      kind,
      rawId: decodeIdentityPart(encodedRawId),
    };
  } catch {
    return null;
  }
}

function hasScopedNode(
  document: DashboardDocument,
  kind: Exclude<GraphNodeRecord["kind"], "document">,
  rawId: string,
): boolean {
  if (kind === "concept") {
    return document.concepts.some((concept) => concept.id === rawId);
  }

  if (kind === "argument") {
    return document.arguments.some((argument) => argument.id === rawId);
  }

  return document.questions.some((question) => question.id === rawId);
}

function getDocumentRawIdKey(documentId: string, rawId: string): string {
  return `${encodeIdentityPart(documentId)}:${encodeIdentityPart(rawId)}`;
}

function encodeIdentityPart(value: string): string {
  return encodeURIComponent(value);
}

function decodeIdentityPart(value: string): string {
  return decodeURIComponent(value);
}
