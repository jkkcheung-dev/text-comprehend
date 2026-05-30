import { useState, useEffect } from "react";
import type { Evidence, SourceRef } from "@text-comprehend/core";
import type { DashboardDocument } from "../data/types";
import { renderMarkdown } from "./markdown-renderer";
import { ComprehensionCheck } from "./comprehension-check";
import styles from "./detail-panel-shell.module.css";

export type DetailSelection =
  | {
      kind: "document";
      label: string;
      documentTitle: string;
      filePath?: string;
      fileType?: string;
      lastAnalyzed?: string;
    }
  | {
      kind: "concept";
      label: string;
      documentTitle: string;
      definition: string;
      importance: string;
      sourceRefs?: SourceRef[];
    }
  | {
      kind: "argument";
      label: string;
      documentTitle: string;
      argumentType: string;
      sourceRefs?: SourceRef[];
      evidence?: Evidence[];
      assumptions: string[];
      gaps: string[];
    }
  | {
      kind: "question";
      label: string;
      documentTitle: string;
      answer: string;
      difficulty: string;
      facet: string;
      sourceRefs?: SourceRef[];
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
      <div className={styles.panel}>
        <div className={styles.emptyDoc}>Select a document from the sidebar to view its details.</div>
      </div>
    );
  }

  if (document.detail.state === "degraded") {
    return (
      <div className={styles.panel}>
        <div className={styles.degradedMessage}>
          <p>Document detail is unavailable for this artifact.</p>
          <p>{document.detail.path}</p>
          <p>{document.detail.error}</p>
        </div>
      </div>
    );
  }

  const simplified = document.detail.simplified;

  const contentForTab = (tab: TabKey): string => {
    switch (tab) {
      case "summary":
        return simplified.layeredSummary;
      case "glossary":
        return simplified.conceptGlossary;
      case "arguments":
        return simplified.argumentMap;
      case "questions":
        return simplified.comprehensionCheck;
    }
  };

  const currentTabIndex = TABS.findIndex((tab) => tab.key === activeTab);

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    let nextIndex = currentTabIndex;
    if (e.key === "ArrowLeft") {
      nextIndex = (currentTabIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === "ArrowRight") {
      nextIndex = (currentTabIndex + 1) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(TABS[nextIndex].key);
    document.getElementById(`tab-${TABS[nextIndex].key}`)?.focus();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.infoBar}>
        <span>
          Selected: <strong className={styles.infoBarValue}>{selection?.label ?? "none"}</strong>
        </span>
        {selection && (
          <>
            <span className={styles.infoBarSeparator}>|</span>
            <span>
              Type: <strong className={styles.infoBarValue}>{selection.kind}</strong>
            </span>
            <span className={styles.infoBarSeparator}>|</span>
            <span>
              Document: <strong className={styles.infoBarValue}>{selection.documentTitle}</strong>
            </span>
          </>
        )}
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="Detail sections" onKeyDown={handleTabKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            tabIndex={activeTab === tab.key ? 0 : -1}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "questions" ? (
          <ComprehensionCheck questions={document.questions} />
        ) : (
          <div
            className={styles.markdownContent}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(contentForTab(activeTab)) }}
          />
        )}
      </div>
    </div>
  );
}
