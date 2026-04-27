// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the ready dashboard shell when data loads", async () => {
    render(
      <App
        loadData={async () => ({
          state: "ready",
          graph: {
            version: "1.0.0",
            generatedAt: "2026-04-28T00:00:00.000Z",
            documents: [],
            edges: [],
          },
          documents: [],
        })}
      />,
    );

    expect(await screen.findByText("Text Comprehend")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("0 documents loaded")).toBeInTheDocument();
    expect(screen.getByText("Graph view available when data is ready.")).toBeInTheDocument();
    expect(screen.getByText("Select a node to inspect its source context.")).toBeInTheDocument();
  });

  it("renders the empty shell state when no artifacts exist", async () => {
    render(<App loadData={async () => ({ state: "empty" })} />);

    expect(await screen.findByText("No dashboard data yet")).toBeInTheDocument();
    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.getByText("Run /comprehend in your workspace to generate dashboard artifacts.")).toBeInTheDocument();
    expect(screen.getByText("Graph view will appear after artifacts are available.")).toBeInTheDocument();
    expect(screen.getByText("Document details will appear here once data loads.")).toBeInTheDocument();
  });

  it("renders the error shell state when data loading fails", async () => {
    render(
      <App
        loadData={async () => ({
          state: "malformed",
          path: ".text-comprehend/knowledge-graph.json",
          error: "Unexpected token",
        })}
      />,
    );

    expect(await screen.findByText("Dashboard data could not be loaded")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText(".text-comprehend/knowledge-graph.json")).toBeInTheDocument();
    expect(screen.getByText("Unexpected token")).toBeInTheDocument();
    expect(screen.getByText("Resolve the artifact issue to restore the dashboard shell.")).toBeInTheDocument();
  });
});
