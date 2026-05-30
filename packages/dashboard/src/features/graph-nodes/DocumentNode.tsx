import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

type DocumentNodeType = Node<{ label: string }, "document">;

export function DocumentNode({ data, selected }: NodeProps<DocumentNodeType>) {
  const borderColor = selected ? "var(--color-primary-light)" : "var(--color-document)";
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderTop: `2px solid ${borderColor}`,
        borderRight: `2px solid ${borderColor}`,
        borderBottom: `2px solid ${borderColor}`,
        borderLeft: `3px solid var(--color-document)`,
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-md)",
        maxWidth: 220,
        fontSize: "var(--text-sm)",
      }}
    >
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 600, color: "var(--color-primary-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {data.label}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
        document
      </div>
    </div>
  );
}
