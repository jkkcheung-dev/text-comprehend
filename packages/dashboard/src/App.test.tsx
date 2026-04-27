// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the dashboard shell", () => {
    render(<App />);

    expect(screen.getByText("Text Comprehend")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Graph canvas")).toBeInTheDocument();
    expect(screen.getByText("Detail panel")).toBeInTheDocument();
  });
});
