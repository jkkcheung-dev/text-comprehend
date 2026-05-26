// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultFacetState } from "./graph-view-model";
import { FacetToggleGroup } from "./facet-toggle-group";

afterEach(() => {
  cleanup();
});

describe("FacetToggleGroup", () => {
  it("renders the supported facet toggles", () => {
    render(<FacetToggleGroup facets={createDefaultFacetState()} onFacetChange={vi.fn()} />);

    expect(screen.getByRole("group", { name: "Visible node types" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Documents" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Concepts" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Arguments" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Questions" })).toBeChecked();
  });

  it("reports facet updates as facet-nextValue pairs", () => {
    const onFacetChange = vi.fn();

    render(
      <FacetToggleGroup
        facets={{ documents: true, concepts: true, arguments: false, questions: true }}
        onFacetChange={onFacetChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Arguments" }));

    expect(onFacetChange).toHaveBeenCalledWith("arguments", true);
  });

  it("reports when an enabled facet is turned off", () => {
    const onFacetChange = vi.fn();

    render(<FacetToggleGroup facets={createDefaultFacetState()} onFacetChange={onFacetChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Concepts" }));

    expect(onFacetChange).toHaveBeenCalledWith("concepts", false);
  });

  it("disables every facet toggle when unavailable", () => {
    render(<FacetToggleGroup facets={createDefaultFacetState()} onFacetChange={vi.fn()} disabled />);

    expect(screen.getByRole("checkbox", { name: "Documents" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Concepts" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Arguments" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Questions" })).toBeDisabled();
  });
});
