// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchControls } from "./search-controls";

afterEach(() => {
  cleanup();
});

describe("SearchControls", () => {
  it("reports query updates from the global search input", () => {
    const onQueryChange = vi.fn();

    render(<SearchControls query="" onQueryChange={onQueryChange} onReset={vi.fn()} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search graph" }), {
      target: { value: "event loop" },
    });

    expect(onQueryChange).toHaveBeenCalledWith("event loop");
  });

  it("invokes reset when the clear action is pressed", () => {
    const onReset = vi.fn();

    render(<SearchControls query="event loop" onQueryChange={vi.fn()} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("disables the search input and clear action when unavailable", () => {
    render(<SearchControls query="event loop" onQueryChange={vi.fn()} onReset={vi.fn()} disabled />);

    expect(screen.getByRole("searchbox", { name: "Search graph" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeDisabled();
  });
});
