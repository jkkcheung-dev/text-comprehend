import { Handle, Position, type Node } from "@xyflow/react";

type DocumentNodeData = { label: string; kind: string; documentId: string };

export function DocumentNode({ data, selected }: { data: DocumentNodeData; selected: boolean }) {
  return (
    <div className={`bg-surface-canvas border rounded-md py-2.5 px-4 max-w-[220px] ${selected ? "border-accent-primary shadow-[0_0_12px_rgba(59,130,246,0.2)]" : "border-border-default"} shadow-[0_2px_8px_rgba(0,0,0,0.5)]`}
      style={{ borderTopColor: selected ? "var(--color-accent-primary)" : "var(--color-facet-document)", borderTopWidth: 2, borderTopStyle: "solid" }}>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div className="font-mono text-[13px] font-semibold text-text-primary truncate">{data.label}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: "var(--color-facet-document)" }} />
        <span className="text-[11px] text-text-muted font-sans">document</span>
      </div>
    </div>
  );
}
