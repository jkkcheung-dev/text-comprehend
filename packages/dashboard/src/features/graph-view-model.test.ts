import { describe, expect, it } from "vitest";
import {
  buildGraphViewModel,
  createDefaultFacetState,
  getSelectedDocumentId,
} from "./graph-view-model";
import {
  createArgument,
  createConcept,
  createGraphEdge,
  createQuestion,
  createReadyDashboardData,
  createDocument,
  createAvailableDetail,
} from "../test/factories";

describe("graph-view-model", () => {
  it("flattens dashboard data into searchable graph nodes", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc-1", "concept-1", "contains"),
        createGraphEdge("concept-1", "concept-2", "defines"),
        createGraphEdge("doc-1", "concept-2", "contains"),
      ],
      documents: [
        {
          ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
          concepts: [createConcept("concept-1", "Event Loop")],
          arguments: [createArgument("argument-1", "Rendering stays responsive")],
          questions: [createQuestion("question-1", "What triggers rerendering?")],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "event",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => node.id)).toContain("doc-1:concept:concept-1");
    expect(model.matchedNodeIds).toContain("doc-1:concept:concept-1");
    expect(model.visibleEdges).toContainEqual({
      source: "doc-1:document:doc-1",
      target: "doc-1:concept:concept-1",
      type: "contains",
      rawSource: "doc-1",
      rawTarget: "concept-1",
    });
  });

  it("narrows the working set to documents connected to the search match", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc-1", "concept-1", "contains"),
        createGraphEdge("doc-2", "concept-2", "contains"),
      ],
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [createConcept("concept-1", "Event Loop")],
          arguments: [],
          questions: [],
        },
        {
          ...createDocument("doc-2", "Database Notes", createAvailableDetail("# Database")),
          concepts: [createConcept("concept-2", "Index Scan")],
          arguments: [createArgument("argument-1", "Rendering stays responsive")],
          questions: [createQuestion("question-1", "What triggers rerendering?")],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "event",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => node.id)).toEqual([
      "doc-1:document:doc-1",
      "doc-1:concept:concept-1",
    ]);
    expect(model.visibleEdges).toEqual([
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-1",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-1",
      },
    ]);
  });

  it("preserves immediate graph context around a matched child node", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc-1", "concept-1", "contains"),
        createGraphEdge("doc-1", "concept-2", "contains"),
        createGraphEdge("concept-1", "concept-2", "defines"),
        createGraphEdge("doc-1", "argument-1", "contains"),
        createGraphEdge("doc-1", "argument-2", "contains"),
        createGraphEdge("argument-2", "argument-1", "supports"),
      ],
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [
            createConcept("concept-1", "Render Cycle", "Browser updates advance in render phases"),
            createConcept("concept-2", "Event Loop"),
          ],
          arguments: [
            createArgument("argument-1", "Responsive apps need predictable scheduling", "main"),
            createArgument("argument-2", "The scheduler drains pending work", "supporting"),
          ],
          questions: [],
        },
      ],
    });

    const conceptModel = buildGraphViewModel(data, {
      searchQuery: "event loop",
      facets: createDefaultFacetState(),
    });

    expect(conceptModel.nodes.map((node) => node.id)).toEqual([
      "doc-1:document:doc-1",
      "doc-1:concept:concept-1",
      "doc-1:concept:concept-2",
    ]);
    expect(sortEdges(conceptModel.visibleEdges)).toEqual(sortEdges([
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-1",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-1",
      },
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-2",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-2",
      },
      {
        source: "doc-1:concept:concept-1",
        target: "doc-1:concept:concept-2",
        type: "defines",
        rawSource: "concept-1",
        rawTarget: "concept-2",
      },
    ]));

    const argumentModel = buildGraphViewModel(data, {
      searchQuery: "pending work",
      facets: createDefaultFacetState(),
    });

    expect(argumentModel.nodes.map((node) => node.id)).toEqual([
      "doc-1:document:doc-1",
      "doc-1:argument:argument-1",
      "doc-1:argument:argument-2",
    ]);
    expect(sortEdges(argumentModel.visibleEdges)).toEqual(sortEdges([
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:argument:argument-1",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "argument-1",
      },
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:argument:argument-2",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "argument-2",
      },
      {
        source: "doc-1:argument:argument-2",
        target: "doc-1:argument:argument-1",
        type: "supports",
        rawSource: "argument-2",
        rawTarget: "argument-1",
      },
    ]));
  });

  it("does not cross-contaminate search context when child ids collide across documents", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc-1", "concept-1", "contains"),
        createGraphEdge("doc-1", "concept-2", "contains"),
        createGraphEdge("concept-2", "concept-1", "defines"),
        createGraphEdge("doc-2", "concept-1", "contains"),
        createGraphEdge("doc-2", "concept-3", "contains"),
        createGraphEdge("concept-3", "concept-1", "defines"),
      ],
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [
            createConcept("concept-1", "Event Loop"),
            createConcept("concept-2", "Render Cycle"),
          ],
          arguments: [],
          questions: [],
        },
        {
          ...createDocument("doc-2", "Database Notes", createAvailableDetail("# Database")),
          concepts: [
            createConcept("concept-1", "Index Scan"),
            createConcept("concept-3", "Query Planner"),
          ],
          arguments: [],
          questions: [],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "event loop",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => `${node.kind}:${node.documentId}:${node.rawId}`)).toEqual([
      "document:doc-1:doc-1",
      "concept:doc-1:concept-1",
      "concept:doc-1:concept-2",
    ]);
    expect(sortEdges(model.visibleEdges)).toEqual(sortEdges([
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-1",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-1",
      },
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-2",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-2",
      },
      {
        source: "doc-1:concept:concept-2",
        target: "doc-1:concept:concept-1",
        type: "defines",
        rawSource: "concept-2",
        rawTarget: "concept-1",
      },
    ]));
  });

  it("does not leak cross-document relationship edges when raw source and target ids are reused", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc-1", "concept-1", "contains"),
        createGraphEdge("doc-1", "concept-2", "contains"),
        createGraphEdge("doc-2", "concept-1", "contains"),
        createGraphEdge("doc-2", "concept-2", "contains"),
        createGraphEdge("concept-2", "concept-1", "defines"),
      ],
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [
            createConcept("concept-1", "Event Loop"),
            createConcept("concept-2", "Render Cycle"),
          ],
          arguments: [],
          questions: [],
        },
        {
          ...createDocument("doc-2", "Database Notes", createAvailableDetail("# Database")),
          concepts: [
            createConcept("concept-1", "Index Scan"),
            createConcept("concept-2", "Query Planner"),
          ],
          arguments: [],
          questions: [],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "event loop",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => `${node.kind}:${node.documentId}:${node.rawId}`)).toEqual([
      "document:doc-1:doc-1",
      "concept:doc-1:concept-1",
      "concept:doc-1:concept-2",
    ]);
    expect(sortEdges(model.visibleEdges)).toEqual(sortEdges([
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-1",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-1",
      },
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-2",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-2",
      },
      {
        source: "doc-1:concept:concept-2",
        target: "doc-1:concept:concept-1",
        type: "defines",
        rawSource: "concept-2",
        rawTarget: "concept-1",
      },
    ]));
  });

  it("keeps a shared relationship edge signature distinct in each visible document context", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc-1", "concept-1", "contains"),
        createGraphEdge("doc-1", "concept-2", "contains"),
        createGraphEdge("doc-2", "concept-1", "contains"),
        createGraphEdge("doc-2", "concept-2", "contains"),
        createGraphEdge("concept-2", "concept-1", "defines"),
      ],
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [
            createConcept("concept-1", "Event Loop"),
            createConcept("concept-2", "Render Cycle"),
          ],
          arguments: [],
          questions: [],
        },
        {
          ...createDocument("doc-2", "Scheduler Notes", createAvailableDetail("# Scheduler")),
          concepts: [
            createConcept("concept-1", "Event Loop"),
            createConcept("concept-2", "Render Cycle"),
          ],
          arguments: [],
          questions: [],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "render",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => `${node.kind}:${node.documentId}:${node.rawId}`)).toEqual([
      "document:doc-1:doc-1",
      "concept:doc-1:concept-1",
      "concept:doc-1:concept-2",
      "document:doc-2:doc-2",
      "concept:doc-2:concept-1",
      "concept:doc-2:concept-2",
    ]);
    expect(sortEdges(model.visibleEdges)).toEqual(sortEdges([
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-1",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-1",
      },
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:concept:concept-2",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "concept-2",
      },
      {
        source: "doc-2:document:doc-2",
        target: "doc-2:concept:concept-1",
        type: "contains",
        rawSource: "doc-2",
        rawTarget: "concept-1",
      },
      {
        source: "doc-2:document:doc-2",
        target: "doc-2:concept:concept-2",
        type: "contains",
        rawSource: "doc-2",
        rawTarget: "concept-2",
      },
      {
        source: "doc-1:concept:concept-2",
        target: "doc-1:concept:concept-1",
        type: "defines",
        rawSource: "concept-2",
        rawTarget: "concept-1",
      },
      {
        source: "doc-2:concept:concept-2",
        target: "doc-2:concept:concept-1",
        type: "defines",
        rawSource: "concept-2",
        rawTarget: "concept-1",
      },
    ]));
  });

  it("keeps the matched document context when child raw ids collide with document ids in other documents", () => {
    const data = createReadyDashboardData({
      graphEdges: [createGraphEdge("doc-1", "shared-node", "contains")],
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [createConcept("shared-node", "Event Loop")],
          arguments: [createArgument("argument-1", "Pending work should stay scheduled", "supporting")],
          questions: [],
        },
        {
          ...createDocument("shared-node", "Conflicting Document Id", createAvailableDetail("# Conflicting")),
          concepts: [],
          arguments: [],
          questions: [],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "event loop",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => `${node.kind}:${node.documentId}:${node.rawId}`)).toEqual([
      "document:doc-1:doc-1",
      "concept:doc-1:shared-node",
    ]);
  });

  it("keeps search context and visible edges kind-aware when raw ids collide within one document", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc-1", "shared-node", "contains"),
        createGraphEdge("shared-node", "doc-1", "questions"),
      ],
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [createConcept("shared-node", "Event Loop")],
          arguments: [createArgument("argument-1", "Pending work should stay scheduled", "supporting")],
          questions: [createQuestion("shared-node", "Which queue runs next?")],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "which queue runs next",
      facets: createDefaultFacetState(),
    });

    expect(model.nodes.map((node) => `${node.kind}:${node.documentId}:${node.rawId}`)).toEqual([
      "document:doc-1:doc-1",
      "question:doc-1:shared-node",
    ]);
    expect(sortEdges(model.visibleEdges)).toEqual(sortEdges([
      {
        source: "doc-1:document:doc-1",
        target: "doc-1:question:shared-node",
        type: "contains",
        rawSource: "doc-1",
        rawTarget: "shared-node",
      },
      {
        source: "doc-1:question:shared-node",
        target: "doc-1:document:doc-1",
        type: "questions",
        rawSource: "shared-node",
        rawTarget: "doc-1",
      },
    ]));
  });

  it("keeps scoped visible edges arbitrary-string-safe when document and child ids contain colons", () => {
    const data = createReadyDashboardData({
      graphEdges: [
        createGraphEdge("doc:1", "concept:2", "contains"),
        createGraphEdge("concept:2", "concept:3", "defines"),
        createGraphEdge("doc:1", "concept:3", "contains"),
      ],
      documents: [
        {
          ...createDocument("doc:1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [
            createConcept("concept:2", "Event Loop"),
            createConcept("concept:3", "Render Cycle"),
          ],
          arguments: [],
          questions: [],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "event loop",
      facets: createDefaultFacetState(),
    });

    expect(sortEdges(model.visibleEdges)).toEqual(sortEdges([
      {
        source: "doc%3A1:document:doc%3A1",
        target: "doc%3A1:concept:concept%3A2",
        type: "contains",
        rawSource: "doc:1",
        rawTarget: "concept:2",
      },
      {
        source: "doc%3A1:document:doc%3A1",
        target: "doc%3A1:concept:concept%3A3",
        type: "contains",
        rawSource: "doc:1",
        rawTarget: "concept:3",
      },
      {
        source: "doc%3A1:concept:concept%3A2",
        target: "doc%3A1:concept:concept%3A3",
        type: "defines",
        rawSource: "concept:2",
        rawTarget: "concept:3",
      },
    ]));
  });

  it("removes hidden facets from nodes and matches", () => {
    const data = createReadyDashboardData();
    const model = buildGraphViewModel(data, {
      searchQuery: "",
      facets: { documents: true, concepts: false, arguments: false, questions: false },
    });

    expect(model.nodes.every((node) => node.kind === "document")).toBe(true);
  });

  it("derives the selected document from a non-document node", () => {
    const data = createReadyDashboardData({
      documents: [
        {
          ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
          concepts: [createConcept("concept-1", "Event Loop")],
        },
      ],
    });

    expect(getSelectedDocumentId(data, "concept-1")).toBe("doc-1");
  });

  it("resolves document-scoped node identities when raw ids collide across documents", () => {
    const data = createReadyDashboardData({
      documents: [
        {
          ...createDocument("doc-1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [createConcept("concept-1", "Event Loop")],
          arguments: [],
          questions: [],
        },
        {
          ...createDocument("doc-2", "Database Notes", createAvailableDetail("# Database")),
          concepts: [createConcept("concept-1", "Index Scan")],
          arguments: [],
          questions: [],
        },
      ],
    });

    expect(getSelectedDocumentId(data, "doc-2:concept:concept-1")).toBe("doc-2");
  });

  it("resolves the selected document when document and child ids contain colons", () => {
    const data = createReadyDashboardData({
      documents: [
        {
          ...createDocument("doc:1", "Rendering Notes", createAvailableDetail("# Rendering")),
          concepts: [createConcept("concept:shared", "Event Loop")],
          arguments: [],
          questions: [],
        },
        {
          ...createDocument("doc:2", "Database Notes", createAvailableDetail("# Database")),
          concepts: [createConcept("concept:shared", "Index Scan")],
          arguments: [],
          questions: [],
        },
      ],
    });

    const model = buildGraphViewModel(data, {
      searchQuery: "",
      facets: createDefaultFacetState(),
    });
    const selectedNode = model.nodes.find(
      (node) => node.documentId === "doc:2" && node.kind === "concept" && node.rawId === "concept:shared",
    );

    expect(selectedNode).toBeDefined();
    expect(getSelectedDocumentId(data, selectedNode!.id)).toBe("doc:2");
  });

  it("falls back safely when the selected node id is null, direct, or stale", () => {
    const data = createReadyDashboardData({
      documents: [
        createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
        createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
      ],
    });

    expect(getSelectedDocumentId(data, null)).toBe("doc-1");
    expect(getSelectedDocumentId(data, "doc-2")).toBe("doc-2");
    expect(getSelectedDocumentId(data, "missing-node")).toBe("doc-1");
  });
});

function sortEdges(
  edges: { source: string; target: string; type: string; rawSource?: string; rawTarget?: string }[],
) {
  return [...edges].sort((left, right) =>
    `${left.source}:${left.target}:${left.type}:${left.rawSource ?? ""}:${left.rawTarget ?? ""}`.localeCompare(
      `${right.source}:${right.target}:${right.type}:${right.rawSource ?? ""}:${right.rawTarget ?? ""}`,
    ),
  );
}
