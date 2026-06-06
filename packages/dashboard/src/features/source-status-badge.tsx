type SourceStatusBadgeProps = {
  source: { mode: string; fixtureName?: string; workspaceRoot?: string; label: string };
};

export function SourceStatusBadge({ source }: SourceStatusBadgeProps) {
  const isFixture = source.mode === "fixture";
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap border ${isFixture ? "bg-facet-document/15 text-facet-document border-facet-document/30" : "bg-accent-success/10 text-accent-success border-accent-success/30"}`}>
      {isFixture ? "Fixture" : "Workspace"}
    </span>
  );
}
