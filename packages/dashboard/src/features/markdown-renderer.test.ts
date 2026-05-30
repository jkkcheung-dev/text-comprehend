import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown-renderer";

describe("renderMarkdown", () => {
  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });

  it("wraps paragraph text in <p>", () => {
    const result = renderMarkdown("Hello world");
    expect(result).toBe("<p>Hello world</p>");
  });

  it("splits double-newline paragraphs into separate <p> tags", () => {
    const result = renderMarkdown("Line one\n\nLine two");
    expect(result).toBe("<p>Line one</p>\n<p>Line two</p>");
  });

  it("converts headings", () => {
    expect(renderMarkdown("# Heading 1")).toBe("<h3>Heading 1</h3>");
    expect(renderMarkdown("## Heading 2")).toBe("<h3>Heading 2</h3>");
    expect(renderMarkdown("### Heading 3")).toBe("<h4>Heading 3</h4>");
  });

  it("converts bold text", () => {
    const result = renderMarkdown("This is **bold** text");
    expect(result).toBe("<p>This is <strong>bold</strong> text</p>");
  });

  it("converts italic text", () => {
    const result = renderMarkdown("This is *italic* text");
    expect(result).toBe("<p>This is <em>italic</em> text</p>");
  });

  it("converts inline code", () => {
    const result = renderMarkdown("Use `npm install` to start");
    expect(result).toBe("<p>Use <code>npm install</code> to start</p>");
  });

  it("converts unordered list items", () => {
    const result = renderMarkdown("- Item one\n- Item two\n- Item three");
    expect(result).toBe("<ul><li>Item one</li>\n<li>Item two</li>\n<li>Item three</li></ul>");
  });

  it("does not convert asterisks inside words", () => {
    const result = renderMarkdown("file*.txt and **bold**");
    expect(result).toBe("<p>file*.txt and <strong>bold</strong></p>");
  });
});
