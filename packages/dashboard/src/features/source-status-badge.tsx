import type { DashboardData } from "../data/types";

type SourceStatusBadgeProps = {
  state: DashboardData["state"];
};

const labels: Record<DashboardData["state"], string> = {
  ready: "Ready",
  empty: "Empty",
  malformed: "Error",
};

export function SourceStatusBadge({ state }: SourceStatusBadgeProps) {
  return <p>{labels[state]}</p>;
}
