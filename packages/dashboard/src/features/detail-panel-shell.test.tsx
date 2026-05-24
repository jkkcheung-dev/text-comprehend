// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createAvailableDetail, createDegradedDetail, createDocument } from "../test/factories";
import { DetailPanelShell } from "./detail-panel-shell";

describe("DetailPanelShell", () => {
  it("shows the empty selection state when no document is selected", () => {
    render(<DetailPanelShell document={null} selectedNodeId={null} />);

    expect(screen.getByText("Select a document to inspect its content.")).toBeInTheDocument();
    expect(screen.getByText("Selected node: none")).toBeInTheDocument();
  });

  it("renders layered summary content for available document detail", () => {
    render(
      <DetailPanelShell
        document={createDocument("doc-1", "Document One", createAvailableDetail("# Document One"))}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByText("# Document One")).toBeInTheDocument();
  });

  it("renders the degraded document detail message and artifact path", () => {
    render(
      <DetailPanelShell
        document={createDocument(
          "doc-2",
          "Document Two",
          createDegradedDetail(
            ".text-comprehend/simplified/doc-2/layered-summary.md",
            "ENOENT: missing file",
          ),
        )}
        selectedNodeId="node-1"
      />,
    );

    expect(screen.getByText("Selected node: node-1")).toBeInTheDocument();
    expect(screen.getByText("Document detail is unavailable for this artifact.")).toBeInTheDocument();
    expect(screen.getByText(".text-comprehend/simplified/doc-2/layered-summary.md")).toBeInTheDocument();
    expect(screen.getByText("ENOENT: missing file")).toBeInTheDocument();
  });
});
