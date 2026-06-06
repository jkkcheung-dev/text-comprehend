import { Handle, Position } from "@xyflow/react";

type FacetNodeData = { label: string; kind: string; documentId: string; dimmed: boolean; highlighted: boolean };

export function QuestionNode({ data, selected }: { data: FacetNodeData; selected: boolean }) {
  const highlightRing = data.highlighted ? " ring-2 ring-emerald-500/60" : "";
  return (
    <div
      className={`bg-surface-canvas border rounded-md py-2.5 px-4 max-w-[200px] ${selected ? "border-accent-primary shadow-[0_0_12px_rgba(59,130,246,0.2)]" : data.highlighted ? `border-emerald-500${highlightRing}` : "border-border-default"} shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${data.dimmed ? "opacity-40" : ""}`}
      style={{ borderTopColor: selected ? "var(--color-accent-primary)" : "var(--color-facet-question)", borderTopWidth: 2, borderTopStyle: "solid" }}
    >
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div className="font-mono text-[13px] font-semibold text-text-primary truncate">{data.label}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: "var(--color-facet-question)" }} />
        <span className="text-[11px] text-text-muted font-sans">question</span>
      </div>
    </div>
  );
}
