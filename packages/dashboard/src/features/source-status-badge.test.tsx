// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createFixtureSource, createWorkspaceSource } from "../test/factories";
import { SourceStatusBadge } from "./source-status-badge";

describe("SourceStatusBadge", () => {
  it("renders Fixture for fixture-backed dashboard data", () => {
    render(<SourceStatusBadge source={createFixtureSource().meta} />);

    expect(screen.getByText("Fixture")).toBeInTheDocument();
  });

  it("renders Workspace for workspace-backed dashboard data", () => {
    render(<SourceStatusBadge source={createWorkspaceSource("/repo").meta} />);

    expect(screen.getByText("Workspace")).toBeInTheDocument();
  });
});
