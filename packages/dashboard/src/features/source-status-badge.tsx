import styles from "./source-status-badge.module.css";
import type { DashboardSourceMeta } from "../data/types";

type SourceStatusBadgeProps = {
  source: DashboardSourceMeta;
};

export function SourceStatusBadge({ source }: SourceStatusBadgeProps) {
  const modeClass = source.mode === "fixture" ? styles.fixture : styles.workspace;
  return <span className={`${styles.badge} ${modeClass}`}>{source.mode === "fixture" ? "Fixture" : "Workspace"}</span>;
}
