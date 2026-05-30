// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardData, DashboardSource } from "./data/types";
import { App } from "./App";
import {
  createAvailableDetail,
  createArgument,
  createConcept,
  createDocument,
  createDegradedDetail,
  createEmptyDashboardData,
  createFixtureSource,
  createGraphEdge,
  createMalformedDashboardData,
  createQuestion,
  createReadyDashboardData,
  createWorkspaceSource,
} from "./test/factories";

const fixtureSource: DashboardSource = createFixtureSource();

afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders the loading shell before async data resolves", () => {
    render(<App source={fixtureSource} loadData={() => new Promise(() => {})} />);

    expect(screen.getByText("Text Comprehend")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search graph" })).toBeInTheDocument();
    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
  });

  it("renders the live shell controls and source details when ready", async () => {
    render(
      <App
        source={createWorkspaceSource("/repo")}
        loadData={async () =>
          createReadyDashboardData({
            source: createWorkspaceSource("/repo").meta,
            documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
          })
        }
      />,
    );

    expect(await screen.findByRole("searchbox", { name: "Search graph" })).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getAllByText("/repo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Concepts" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Arguments" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Questions" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Graph canvas" })).toBeInTheDocument();
    expect(screen.getByText("Detail panel")).toBeInTheDocument();
    expect(
      screen.queryByText("Search, facet filters, and graph node selection will be available after app wiring lands."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("# Document One")).toBeInTheDocument();
  });

  it("syncs graph-node selection back to the document list and detail panel", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () =>
          createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [
              {
                ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
                concepts: [
                  {
                    ...createConcept("concept-1", "Event Loop"),
                    sourceRefs: [{ documentId: "doc-1", startLine: 4, endLine: 7, excerpt: "Event loop excerpt" }],
                  },
                ],
              },
            ],
            graphEdges: [
              createGraphEdge("doc-1", "concept-1", "contains"),
              createGraphEdge("concept-1", "concept-1", "defines"),
            ],
          })
        }
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Select graph node Event Loop" }));

    expect(screen.getByRole("button", { name: "Document One" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: "Event Loop" })).toBeInTheDocument();
    expect(screen.getByText("Node type: concept")).toBeInTheDocument();
    expect(screen.getByText("Event Loop definition")).toBeInTheDocument();
    expect(screen.getByText("Importance: core")).toBeInTheDocument();
    expect(screen.getByText("doc-1 lines 4-7: Event loop excerpt")).toBeInTheDocument();
  });

  it("renders document metadata plus argument and question inspection content from the selected graph node", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () =>
          createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [
              {
                ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
                arguments: [
                  {
                    ...createArgument("argument-1", "Rendering stays responsive"),
                    evidence: [
                      {
                        content: "Profiler samples show shorter commits.",
                        type: "data",
                        strength: "strong",
                        sourceRef: {
                          documentId: "doc-1",
                          startLine: 13,
                          endLine: 14,
                          excerpt: "Evidence excerpt",
                        },
                      },
                    ],
                    sourceRefs: [{ documentId: "doc-1", startLine: 10, endLine: 12, excerpt: "Argument excerpt" }],
                  },
                ],
                questions: [
                  {
                    ...createQuestion("question-1", "What triggers rerendering?"),
                    sourceRefs: [{ documentId: "doc-1", startLine: 21, endLine: 22, excerpt: "Question excerpt" }],
                  },
                ],
              },
            ],
            graphEdges: [
              createGraphEdge("doc-1", "argument-1", "contains"),
              createGraphEdge("question-1", "doc-1", "questions"),
            ],
          })
        }
      />,
    );

    expect(await screen.findByText("# Document One")).toBeInTheDocument();
    expect(screen.getByText("Node type: document")).toBeInTheDocument();
    expect(screen.getByText("File path: docs/doc-1.md")).toBeInTheDocument();
    expect(screen.getByText("File type: md")).toBeInTheDocument();
    expect(screen.getByText("Last analyzed: 2026-04-28T00:00:00.000Z")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select graph node Rendering stays responsive" }));

    expect(screen.getByText("Node type: argument")).toBeInTheDocument();
    expect(screen.getByText("Evidence items: 1")).toBeInTheDocument();
    expect(screen.getByText("data (strong): Profiler samples show shorter commits.")).toBeInTheDocument();
    expect(screen.getByText("doc-1 lines 10-12: Argument excerpt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select graph node What triggers rerendering?" }));

    expect(screen.getByText("Node type: question")).toBeInTheDocument();
    expect(screen.getByText("doc-1 lines 21-22: Question excerpt")).toBeInTheDocument();
  });

  it("switches the selected document and degrades only the detail panel", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () =>
          createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [
              createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
              createDocument(
                "doc-2",
                "Document Two",
                createDegradedDetail(
                  ".text-comprehend/simplified/doc-2/layered-summary.md",
                  "ENOENT: missing file",
                ),
              ),
            ],
          })
        }
      />,
    );

    expect(await screen.findByText("# Document One")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Document Two" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Document Two" })).toHaveAttribute("aria-current", "true");
      expect(screen.getByRole("heading", { name: "Document Two" })).toBeInTheDocument();
      expect(screen.getByText("Document detail is unavailable for this artifact.")).toBeInTheDocument();
      expect(screen.getByText(".text-comprehend/simplified/doc-2/layered-summary.md")).toBeInTheDocument();
    });

    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
  });

  it("does not let the initial ready-state selection overwrite the first manual document selection", async () => {
    vi.resetModules();

    try {
      vi.doMock("./features/dashboard-shell", async () => {
        const React = await import("react");

        return {
          DashboardShell: ({
            data,
            onSelectDocument,
            selectedDocumentId,
          }: {
            data: DashboardData;
            onSelectDocument: (documentId: string) => void;
            selectedDocumentId: string | null;
          }) => {
            const hasQueuedSelection = React.useRef(false);

            if (data.state === "ready" && selectedDocumentId === "doc-1" && !hasQueuedSelection.current) {
              hasQueuedSelection.current = true;
              queueMicrotask(() => {
                onSelectDocument("doc-2");
              });
            }

            return <p data-testid="selected-document-id">{selectedDocumentId ?? "none"}</p>;
          },
        };
      });

      const { App: IsolatedApp } = await import("./App");

      render(
        <IsolatedApp
          source={fixtureSource}
          loadData={async () =>
            createReadyDashboardData({
              source: fixtureSource.meta,
              documents: [
                createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
                createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
              ],
            })
          }
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("selected-document-id")).toHaveTextContent("doc-2");
      });
    } finally {
      vi.doUnmock("./features/dashboard-shell");
      vi.resetModules();
    }
  });

  it("keeps document-list clicks focused on document detail when the documents facet is off", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () =>
          createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [
              {
                ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
                concepts: [createConcept("concept-1", "Event Loop")],
              },
            ],
            graphEdges: [createGraphEdge("doc-1", "concept-1", "contains")],
          })
        }
      />,
    );

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Documents" }));

    fireEvent.click(screen.getByRole("button", { name: "Select graph node Event Loop" }));

    expect(screen.getByText("Node type: concept")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Document One" }));

    expect(screen.getByRole("heading", { name: "Document One" })).toBeInTheDocument();
    expect(screen.getByText("Node type: document")).toBeInTheDocument();
    expect(screen.getByText("# Document One")).toBeInTheDocument();
    expect(screen.queryByText("Node type: concept")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Event Loop" })).not.toBeInTheDocument();
  });

  it("clears selection when search filters out the current node", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () =>
          createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [
              {
                ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
                concepts: [createConcept("concept-1", "Event Loop")],
              },
              {
                ...createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
                questions: [createQuestion("question-1", "Why hydrate?")],
              },
            ],
            graphEdges: [
              createGraphEdge("doc-1", "concept-1", "contains"),
              createGraphEdge("question-1", "doc-2", "questions"),
            ],
          })
        }
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Select graph node Why hydrate?" }));
    expect(screen.getByRole("heading", { name: "Why hydrate?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document Two" })).toHaveAttribute("aria-current", "true");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search graph" }), {
      target: { value: "event" },
    });

    expect(await screen.findByText("Selected node: none")).toBeInTheDocument();
    expect(screen.getByText("Select a document to inspect its content.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document One" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("button", { name: "Document Two" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Why hydrate?" })).not.toBeInTheDocument();
  });

  it("clears node and document selection when filters leave no visible graph nodes", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () =>
          createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [
              {
                ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
                concepts: [createConcept("concept-1", "Event Loop")],
              },
              {
                ...createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
                questions: [createQuestion("question-1", "Why hydrate?")],
              },
            ],
            graphEdges: [
              createGraphEdge("doc-1", "concept-1", "contains"),
              createGraphEdge("question-1", "doc-2", "questions"),
            ],
          })
        }
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Select graph node Why hydrate?" }));

    expect(screen.getByRole("heading", { name: "Why hydrate?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Document Two" })).toHaveAttribute("aria-current", "true");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search graph" }), {
      target: { value: "missing-query" },
    });

    expect(await screen.findByText("No graph matches the current search and facet filters.")).toBeInTheDocument();
    expect(screen.getByText("Selected node: none")).toBeInTheDocument();
    expect(screen.getByText("Select a document to inspect its content.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Why hydrate?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Document One" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Document Two" })).not.toBeInTheDocument();
  });

  it("shows the malformed state when the first load fails before any ready data exists", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () => createMalformedDashboardData(fixtureSource.meta)}
      />,
    );

    expect(await screen.findByText("Dashboard data could not be loaded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
  });

  it("routes synchronous loadData throws to the malformed state", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={() => {
          throw new Error("Broken payload");
        }}
      />,
    );

    expect(await screen.findByText("Dashboard data could not be loaded")).toBeInTheDocument();
    expect(screen.getByText("dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("Broken payload")).toBeInTheDocument();
  });

  it("preserves the last ready view and shows a warning when a manual refresh returns malformed data", async () => {
    const readyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    const loadData = vi
      .fn<(source: DashboardSource) => Promise<DashboardData>>()
      .mockResolvedValueOnce(readyData)
      .mockResolvedValueOnce(createMalformedDashboardData(fixtureSource.meta));

    render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(await screen.findByText("Dashboard refresh failed. Showing the last loaded data.")).toBeInTheDocument();
    expect(screen.getByText("# Document One")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard data could not be loaded")).not.toBeInTheDocument();
  });

  it("retries the same source and clears the warning after a successful reload", async () => {
    const readyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    const refreshedReadyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One v2"))],
    });

    const loadData = vi
      .fn<(source: DashboardSource) => Promise<DashboardData>>()
      .mockResolvedValueOnce(readyData)
      .mockResolvedValueOnce(createMalformedDashboardData(fixtureSource.meta))
      .mockResolvedValueOnce(refreshedReadyData);

    render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(await screen.findByText("Dashboard refresh failed. Showing the last loaded data.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("# Document One v2")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard refresh failed. Showing the last loaded data.")).not.toBeInTheDocument();
  });

  it("shows the empty state when a refresh returns empty data", async () => {
    const readyData: DashboardData = createReadyDashboardData({
      source: fixtureSource.meta,
      documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
    });

    const loadData = vi
      .fn<(source: DashboardSource) => Promise<DashboardData>>()
      .mockResolvedValueOnce(readyData)
      .mockResolvedValueOnce(createEmptyDashboardData(fixtureSource.meta));

    render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(
      await screen.findByText("Run /comprehend in your workspace to generate dashboard artifacts."),
    ).toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard refresh failed. Showing the last loaded data.")).not.toBeInTheDocument();
  });

  it("shows loading immediately when the source changes", async () => {
    const nextSource: DashboardSource = createWorkspaceSource("/repo");

    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => {
      if (source.meta.mode === "fixture") {
        return createReadyDashboardData({
          source: source.meta,
          documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
        });
      }

      return new Promise(() => {});
    });

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    view.rerender(<App source={nextSource} loadData={loadData} />);

    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getAllByText("/repo").length).toBeGreaterThanOrEqual(1);
  });

  it("drops the stale snapshot immediately when the source key changes", async () => {
    const workspaceSource: DashboardSource = createWorkspaceSource("/repo");

    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => {
      if (source.meta.mode === "fixture") {
        if (loadData.mock.calls.length === 1) {
          return createReadyDashboardData({
            source: fixtureSource.meta,
            documents: [createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))],
          });
        }

        return createMalformedDashboardData(fixtureSource.meta);
      }

      return new Promise(() => {});
    });

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));

    expect(await screen.findByText("Dashboard refresh failed. Showing the last loaded data.")).toBeInTheDocument();

    view.rerender(<App source={workspaceSource} loadData={loadData} />);

    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard refresh failed. Showing the last loaded data.")).not.toBeInTheDocument();
  });

  it("does not reload or lose selection when the same logical source is recreated", async () => {
    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => ({
      ...createReadyDashboardData({
        source: source.meta,
        documents: [
          createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
          createDocument("doc-2", "Document Two", createAvailableDetail("# Document Two")),
        ],
      }),
    }));

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Document Two" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Document Two" })).toHaveAttribute("aria-current", "true");
      expect(screen.getByText("# Document Two")).toBeInTheDocument();
    });

    expect(screen.queryByText("Loading dashboard data...")).not.toBeInTheDocument();

    view.rerender(
      <App
        source={createFixtureSource()}
        loadData={async (source) => loadData(source)}
      />,
    );

    expect(screen.queryByText("Loading dashboard data...")).not.toBeInTheDocument();
    expect(screen.getByText("# Document Two")).toBeInTheDocument();
    expect(loadData).toHaveBeenCalledTimes(1);
  });

  it("switches graph labels across zoom levels and resets zoom on source change", async () => {
    const nextSource: DashboardSource = createWorkspaceSource("/repo");
    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) =>
      createReadyDashboardData({
        source: source.meta,
        documents: [
          {
            ...createDocument("doc-1", "Document One", createAvailableDetail("# Document One")),
            concepts: [createConcept("concept-1", "Concept One")],
          },
        ],
        graphEdges: [createGraphEdge("doc-1", "concept-1", "contains")],
      }),
    );

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("Zoom: 1.0x")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Concept One" })).toHaveTextContent("Concept One");

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));

    await waitFor(() => {
      expect(screen.getByText("Zoom: 0.8x")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Select graph node Concept One" })).toHaveTextContent("concept");
    });

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    await waitFor(() => {
      expect(screen.getByText("Zoom: 1.6x")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Select graph node Concept One" })).toHaveTextContent(
        "Concept One (concept)",
      );
    });

    view.rerender(<App source={nextSource} loadData={loadData} />);

    expect(await screen.findByText("Zoom: 1.0x")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select graph node Concept One" })).toHaveTextContent("Concept One");
  });
});
