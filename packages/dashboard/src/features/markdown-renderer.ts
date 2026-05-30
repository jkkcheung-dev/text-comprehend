export function renderMarkdown(content: string): string {
  if (!content) return "";

  const html = content
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h4>${line.slice(4)}</h4>`;
      if (line.startsWith("## ")) return `<h3>${line.slice(3)}</h3>`;
      if (line.startsWith("# ")) return `<h3>${line.slice(2)}</h3>`;
      return line;
    })
    .join("\n");

  const withBold = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  const withCode = withItalic.replace(/`(.+?)`/g, "<code>$1</code>");

  const trimmed = withCode.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("<ul>")) return trimmed;

  if (trimmed.startsWith("- ")) {
    const items = trimmed
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => `<li>${line.slice(2)}</li>`)
      .join("\n");
    return `<ul>${items}</ul>`;
  }

  const paragraphs = trimmed.split("\n\n").map((p) => {
    const clean = p.replace(/\n/g, " ").trim();
    if (!clean) return "";
    if (clean.startsWith("<h") || clean.startsWith("<ul")) return clean;
    return `<p>${clean}</p>`;
  });

  return paragraphs.filter(Boolean).join("\n");
}
