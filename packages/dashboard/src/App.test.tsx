// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardData, DashboardDocument, DashboardSource } from "./data/types";
import { App } from "./App";

const fixtureSource: DashboardSource = {
  meta: {
    mode: "fixture",
    label: "Fixture: dashboard-workspace",
    fixtureName: "dashboard-workspace",
  },
  read: async () => "",
};

afterEach(() => {
  cleanup();
});

function createDocument(
  id: string,
  title: string,
  detail: DashboardDocument["detail"],
): DashboardDocument {
  return {
    id,
    filePath: `docs/${id}.md`,
    title,
    fileType: "md",
    lastAnalyzed: "2026-04-28T00:00:00.000Z",
    fileHash: `hash-${id}`,
    summary: { thesis: "Thesis", overview: "Overview", sections: [] },
    concepts: [],
    arguments: [],
    questions: [],
    detail,
  };
}

describe("App", () => {
  it("renders the loading shell before async data resolves", () => {
    render(<App source={fixtureSource} loadData={() => new Promise(() => {})} />);

    expect(screen.getByText("Text Comprehend")).toBeInTheDocument();
    expect(screen.getByText("Search (coming soon)")).toBeInTheDocument();
    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
  });

  it("renders the Option A shell and source details when ready", async () => {
    render(
      <App
        source={{
          meta: {
            mode: "workspace",
            label: "Workspace: /repo",
            workspaceRoot: "/repo",
          },
          read: async () => "",
        }}
        loadData={async () => ({
          state: "ready",
          source: {
            mode: "workspace",
            label: "Workspace: /repo",
            workspaceRoot: "/repo",
          },
          graph: {
            version: "1.0.0",
            generatedAt: "2026-04-28T00:00:00.000Z",
            documents: [],
            edges: [],
          },
          documents: [
            createDocument("doc-1", "Document One", {
              state: "available",
              simplified: {
                layeredSummary: "# Document One",
                conceptGlossary: "# Glossary",
                argumentMap: "# Argument Map",
                comprehensionCheck: "# Questions",
              },
            }),
          ],
        })}
      />,
    );

    expect(await screen.findByText("Search (coming soon)")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("/repo")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Facet filters (coming soon)")).toBeInTheDocument();
    expect(screen.getByText("Graph canvas")).toBeInTheDocument();
    expect(screen.getByText("Detail panel")).toBeInTheDocument();
    expect(screen.getByText("# Document One")).toBeInTheDocument();
  });

  it("switches the selected document and degrades only the detail panel", async () => {
    render(
      <App
        source={fixtureSource}
        loadData={async () => ({
          state: "ready",
          source: fixtureSource.meta,
          graph: {
            version: "1.0.0",
            generatedAt: "2026-04-28T00:00:00.000Z",
            documents: [],
            edges: [],
          },
          documents: [
            createDocument("doc-1", "Document One", {
              state: "available",
              simplified: {
                layeredSummary: "# Document One",
                conceptGlossary: "# Glossary One",
                argumentMap: "# Argument One",
                comprehensionCheck: "# Questions One",
              },
            }),
            createDocument("doc-2", "Document Two", {
              state: "degraded",
              path: ".text-comprehend/simplified/doc-2/layered-summary.md",
              error: "ENOENT: missing file",
            }),
          ],
        })}
      />,
    );

    expect(await screen.findByText("# Document One")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Document Two" }));
    expect(screen.getByText("Document detail is unavailable for this artifact.")).toBeInTheDocument();
    expect(screen.getByText(".text-comprehend/simplified/doc-2/layered-summary.md")).toBeInTheDocument();
    expect(screen.getByText("Graph view available when data is ready.")).toBeInTheDocument();
  });

  it("shows loading immediately when the source changes", async () => {
    const nextSource: DashboardSource = {
      meta: {
        mode: "workspace",
        label: "Workspace: /repo",
        workspaceRoot: "/repo",
      },
      read: async () => "",
    };

    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => {
      if (source.meta.mode === "fixture") {
        return {
          state: "ready" as const,
          source: source.meta,
          graph: {
            version: "1.0.0",
            generatedAt: "2026-04-28T00:00:00.000Z",
            documents: [],
            edges: [],
          },
          documents: [
            createDocument("doc-1", "Document One", {
              state: "available",
              simplified: {
                layeredSummary: "# Document One",
                conceptGlossary: "# Glossary One",
                argumentMap: "# Argument One",
                comprehensionCheck: "# Questions One",
              },
            }),
          ],
        };
      }

      return new Promise(() => {});
    });

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();

    view.rerender(<App source={nextSource} loadData={loadData} />);

    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument();
    expect(screen.queryByText("# Document One")).not.toBeInTheDocument();
    expect(screen.getByText("Workspace: /repo")).toBeInTheDocument();
  });

  it("does not reload or lose selection when the same logical source is recreated", async () => {
    const loadData = vi.fn<(source: DashboardSource) => Promise<DashboardData>>(async (source) => ({
      state: "ready" as const,
      source: source.meta,
      graph: {
        version: "1.0.0",
        generatedAt: "2026-04-28T00:00:00.000Z",
        documents: [],
        edges: [],
      },
      documents: [
        createDocument("doc-1", "Document One", {
          state: "available",
          simplified: {
            layeredSummary: "# Document One",
            conceptGlossary: "# Glossary One",
            argumentMap: "# Argument One",
            comprehensionCheck: "# Questions One",
          },
        }),
        createDocument("doc-2", "Document Two", {
          state: "available",
          simplified: {
            layeredSummary: "# Document Two",
            conceptGlossary: "# Glossary Two",
            argumentMap: "# Argument Two",
            comprehensionCheck: "# Questions Two",
          },
        }),
      ],
    }));

    const view = render(<App source={fixtureSource} loadData={loadData} />);

    expect(await screen.findByText("# Document One")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Document Two" }));
    expect(screen.getByText("# Document Two")).toBeInTheDocument();

    view.rerender(
      <App
        source={{
          meta: fixtureSource.meta,
          read: async () => "",
        }}
        loadData={async (source) => loadData(source)}
      />,
    );

    expect(screen.queryByText("Loading dashboard data...")).not.toBeInTheDocument();
    expect(screen.getByText("# Document Two")).toBeInTheDocument();
    expect(loadData).toHaveBeenCalledTimes(1);
  });
});
