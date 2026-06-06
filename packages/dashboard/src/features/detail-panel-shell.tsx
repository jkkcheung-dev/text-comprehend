import { useState, useEffect } from "react";
import type { DashboardDocument } from "../data/types";
import { renderMarkdown } from "./markdown-renderer";
import { ComprehensionCheck } from "./comprehension-check";

export type DetailSelection = {
  kind: string;
  label: string;
  documentTitle: string;
};

type TabKey = "summary" | "glossary" | "arguments" | "questions";

const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "Layered Summary" },
  { key: "glossary", label: "Concept Glossary" },
  { key: "arguments", label: "Argument Map" },
  { key: "questions", label: "Comprehension Check" },
];

type DetailPanelShellProps = {
  document: DashboardDocument | null;
  selectedNodeId: string | null;
  selection: DetailSelection | null;
};

export function DetailPanelShell({ document, selectedNodeId, selection }: DetailPanelShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  useEffect(() => {
    setActiveTab("summary");
  }, [document?.id]);

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm gap-1">
        <span className="text-xl opacity-30">⊘</span>
        <span>Select a document from the sidebar</span>
        <span className="text-text-muted text-xs opacity-60">to view its details</span>
      </div>
    );
  }

  if (document.detail.state === "degraded") {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-accent-danger/8 border-b border-accent-danger/15">
          <p className="text-accent-danger text-xs font-semibold">Document detail unavailable</p>
          <p className="text-text-secondary text-[11px] mt-1 font-mono">{document.detail.path}</p>
          <p className="text-text-muted text-[11px]">{document.detail.error}</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Re-run /comprehend --retry-failed to attempt recovery
        </div>
      </div>
    );
  }

  const simplified = document.detail.simplified;

  const contentForTab = (tab: TabKey): string => {
    switch (tab) {
      case "summary": return simplified.layeredSummary;
      case "glossary": return simplified.conceptGlossary;
      case "arguments": return simplified.argumentMap;
      case "questions": return simplified.comprehensionCheck;
    }
  };

  const currentTabIndex = TABS.findIndex((t) => t.key === activeTab);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let next = currentTabIndex;
    if (e.key === "ArrowRight") next = (currentTabIndex + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (currentTabIndex - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(TABS[next].key);
    window.document.getElementById(`tab-${TABS[next].key}`)?.focus();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Info bar */}
      <div className="h-8 flex items-center px-4 gap-3 text-[11px] text-text-secondary border-b border-surface-raised shrink-0">
        <span>Selected: <strong className="text-text-primary font-semibold">{selection?.label ?? "none"}</strong></span>
        {selection && (
          <>
            <span className="text-border-default">|</span>
            <span>Type: <strong className="text-text-primary font-semibold">{selection.kind}</strong></span>
            <span className="text-border-default">|</span>
            <span>Document: <strong className="text-text-primary font-semibold">{selection.documentTitle}</strong></span>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-surface-raised shrink-0" role="tablist" aria-label="Detail sections" onKeyDown={handleKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            tabIndex={activeTab === tab.key ? 0 : -1}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-mono text-xs transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.key ? "text-accent-primary border-accent-primary font-semibold" : "text-text-muted border-transparent hover:text-text-secondary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "questions" ? (
          <ComprehensionCheck questions={document.questions} />
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none text-sm text-text-secondary leading-relaxed [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-text-primary [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-text-primary [&_code]:font-mono [&_code]:text-xs [&_code]:bg-surface-raised [&_code]:px-1 [&_code]:rounded [&_strong]:text-text-primary"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(contentForTab(activeTab)) }}
          />
        )}
      </div>
    </div>
  );
}
