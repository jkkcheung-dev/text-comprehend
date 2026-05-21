import type { DashboardSourceMeta } from "../data/types";

type SourceStatusBadgeProps = {
  source: DashboardSourceMeta;
};

export function SourceStatusBadge({ source }: SourceStatusBadgeProps) {
  return <p>{source.mode === "fixture" ? "Fixture" : "Workspace"}</p>;
}
