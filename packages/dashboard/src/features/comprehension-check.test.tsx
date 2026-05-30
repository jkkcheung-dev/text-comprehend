// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ComprehensionCheck } from "./comprehension-check";
import { createQuestion } from "../test/factories";

describe("ComprehensionCheck", () => {
  const questions = [
    createQuestion("q1", "What is modularity?"),
    createQuestion("q2", "Why use modules?"),
    createQuestion("q3", "What is coupling?"),
  ];

  afterEach(() => {
    cleanup();
  });

  it("renders all questions", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.getByText("What is modularity?", { exact: false })).toBeDefined();
    expect(screen.getByText("Why use modules?", { exact: false })).toBeDefined();
    expect(screen.getByText("What is coupling?", { exact: false })).toBeDefined();
  });

  it("shows question count and difficulty summary", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.getByText(/3 questions/)).toBeDefined();
  });

  it("answers are hidden by default", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.queryByText("Answer")).toBeNull();
  });

  it("reveals answer on Show Answer click", async () => {
    render(<ComprehensionCheck questions={questions} />);
    const buttons = screen.getAllByText("Show Answer");
    fireEvent.click(buttons[0]);
    expect(screen.getByText("Answer")).toBeDefined();
  });

  it("hides answer on Hide Answer click", async () => {
    render(<ComprehensionCheck questions={questions} />);
    fireEvent.click(screen.getAllByText("Show Answer")[0]);
    fireEvent.click(screen.getByText("Hide Answer"));
    expect(screen.queryByText("Answer")).toBeNull();
  });

  it("Show All Answers reveals all", async () => {
    render(<ComprehensionCheck questions={questions} />);
    fireEvent.click(screen.getByText("Show All"));
    expect(screen.getAllByText("Answer").length).toBe(3);
  });

  it("Hide All hides all revealed answers", async () => {
    render(<ComprehensionCheck questions={questions} />);
    fireEvent.click(screen.getByText("Show All"));
    fireEvent.click(screen.getByText("Hide All"));
    expect(screen.queryByText("Answer")).toBeNull();
  });

  it("renders difficulty badges", () => {
    render(<ComprehensionCheck questions={questions} />);
    expect(screen.getAllByText("basic").length).toBe(3);
  });

  it("shows empty message when no questions", () => {
    render(<ComprehensionCheck questions={[]} />);
    expect(screen.getByText(/No comprehension questions/)).toBeDefined();
  });
});
