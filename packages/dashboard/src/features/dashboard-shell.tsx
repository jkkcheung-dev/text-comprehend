import type { DashboardData } from "../data/types";
import { DetailPanelShell } from "./detail-panel-shell";
import { SourceStatusBadge } from "./source-status-badge";

type DashboardShellProps = {
  data: DashboardData;
};

export function DashboardShell({ data }: DashboardShellProps) {
  if (data.state === "ready") {
    return (
      <main>
        <h1>Text Comprehend</h1>
        <SourceStatusBadge state={data.state} />
        <section>
          <h2>Documents</h2>
          <p>{data.documents.length} documents loaded</p>
        </section>
        <section>
          <h2>Graph view</h2>
          <p>Graph view available when data is ready.</p>
        </section>
        <DetailPanelShell>Select a node to inspect its source context.</DetailPanelShell>
      </main>
    );
  }

  if (data.state === "empty") {
    return (
      <main>
        <h1>Text Comprehend</h1>
        <SourceStatusBadge state={data.state} />
        <section>
          <h2>Documents</h2>
          <p>No dashboard data yet</p>
          <p>Run /comprehend in your workspace to generate dashboard artifacts.</p>
        </section>
        <section>
          <h2>Graph view</h2>
          <p>Graph view will appear after artifacts are available.</p>
        </section>
        <DetailPanelShell>Document details will appear here once data loads.</DetailPanelShell>
      </main>
    );
  }

  return (
    <main>
      <h1>Text Comprehend</h1>
      <SourceStatusBadge state={data.state} />
      <section>
        <h2>Documents</h2>
        <p>Dashboard data could not be loaded</p>
        <p>{data.path}</p>
        <p>{data.error}</p>
      </section>
      <section>
        <h2>Graph view</h2>
        <p>Resolve the artifact issue to restore the dashboard shell.</p>
      </section>
      <DetailPanelShell>Document details are unavailable until the artifact issue is fixed.</DetailPanelShell>
    </main>
  );
}
