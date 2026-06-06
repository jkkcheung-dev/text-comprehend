import { useState } from "react";

type Question = {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  facet: string;
  sourceRefs?: unknown[];
};

type ComprehensionCheckProps = {
  questions: Question[];
};

function difficultyStyle(d: string): string {
  if (d === "intermediate") return "bg-accent-warning/15 text-accent-warning";
  if (d === "advanced") return "bg-accent-danger/10 text-accent-danger";
  return "bg-accent-success/10 text-accent-success";
}

export function ComprehensionCheck({ questions }: ComprehensionCheckProps) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setRevealed((prev) => {
    const next = new Set(prev);
    prev.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const showAll = () => setRevealed(new Set(questions.map((q) => q.id)));
  const hideAll = () => setRevealed(new Set());

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        No comprehension questions were generated for this document.
      </div>
    );
  }

  const counts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ");

  return (
    <div className="py-2">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap px-3 py-2 bg-surface-raised rounded-md text-xs text-text-secondary mb-3">
        <span>{questions.length} questions</span>
        <span className="text-border-default" aria-hidden="true">|</span>
        <span>{summary}</span>
        <span className="text-border-default" aria-hidden="true">|</span>
        <span>Revealed: {revealed.size} of {questions.length}</span>
        <span className="flex-1" />
        {revealed.size === questions.length ? (
          <button onClick={hideAll} className="text-[10px] px-2.5 py-1 border border-border-default rounded text-text-secondary hover:text-text-primary transition-colors">
            Hide All
          </button>
        ) : (
          <button onClick={showAll} className="text-[10px] px-2.5 py-1 border border-border-default rounded text-text-secondary hover:text-text-primary transition-colors">
            Show All
          </button>
        )}
      </div>

      {/* Question cards */}
      {questions.map((q, i) => (
        <div key={q.id} className="border border-surface-raised rounded-md mb-2 overflow-hidden">
          <div className="flex items-start gap-3 p-3">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 font-mono mt-px ${difficultyStyle(q.difficulty)}`}>
              {q.difficulty}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary m-0">
                {i + 1}. {q.question}
              </p>
              {revealed.has(q.id) && (
                <div className="mt-2 p-3 bg-accent-success/8 border-t-2 border-accent-success rounded" style={{ borderTopWidth: 2 }}>
                  <p className="text-sm text-text-secondary m-0">{q.answer}</p>
                </div>
              )}
              {revealed.has(q.id) ? (
                <button onClick={() => toggle(q.id)} className="mt-2 text-[10px] px-2.5 py-1 bg-surface-raised border border-surface-raised rounded text-text-secondary hover:bg-surface-panel transition-colors">
                  Hide Answer
                </button>
              ) : (
                <button onClick={() => toggle(q.id)} className="mt-2 text-[10px] px-2.5 py-1 bg-accent-primary text-white rounded hover:opacity-90 transition-colors">
                  Show Answer
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
