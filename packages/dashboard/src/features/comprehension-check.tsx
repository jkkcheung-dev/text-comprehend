import { useState } from "react";
import styles from "./comprehension-check.module.css";

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

function difficultyClass(difficulty: string): string {
  if (difficulty === "intermediate") return styles.difficultyIntermediate;
  if (difficulty === "advanced") return styles.difficultyAdvanced;
  return styles.difficultyBasic;
}

export function ComprehensionCheck({ questions }: ComprehensionCheckProps) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const revealAll = () => setRevealedIds(new Set(questions.map((q) => q.id)));
  const hideAll = () => setRevealedIds(new Set());

  if (questions.length === 0) {
    return (
      <p className={styles.emptyMessage}>
        No comprehension questions were generated for this document.
      </p>
    );
  }

  const difficultyCounts = questions.reduce(
    (acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const difficultySummary = Object.entries(difficultyCounts)
    .map(([key, count]) => `${count} ${key}`)
    .join(", ");

  return (
    <div className={styles.wrapper}>
      <div className={styles.summary}>
        <span>{questions.length} questions</span>
        <span className={styles.summarySeparator} aria-hidden="true">|</span>
        <span>{difficultySummary}</span>
        <span className={styles.summarySeparator} aria-hidden="true">|</span>
        <span>Revealed: {revealedIds.size} of {questions.length}</span>
        <span className={styles.summarySpacer} />
        {revealedIds.size === questions.length ? (
          <button type="button" className={styles.summaryButton} onClick={hideAll}>
            Hide All
          </button>
        ) : (
          <button type="button" className={styles.summaryButton} onClick={revealAll}>
            Show All
          </button>
        )}
      </div>

      {questions.map((question, index) => (
        <div key={question.id} className={styles.questionCard}>
          <div className={styles.questionBody}>
            <span className={`${styles.difficultyBadge} ${difficultyClass(question.difficulty)}`}>
              {question.difficulty}
            </span>
            <div className={styles.questionContent}>
              <p className={styles.questionText} id={`question-${question.id}`}>
                {index + 1}. {question.question}
              </p>
              {revealedIds.has(question.id) && (
                <div className={styles.answerBox}>
                  <p className={styles.answerText}>{question.answer}</p>
                </div>
              )}
              {revealedIds.has(question.id) ? (
                <button
                  type="button"
                  className={styles.hideButton}
                  onClick={() => toggleReveal(question.id)}
                  aria-label={`Hide answer for "${question.question}"`}
                  aria-describedby={`question-${question.id}`}
                  aria-expanded={revealedIds.has(question.id)}
                >
                  Hide Answer
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.revealButton}
                  onClick={() => toggleReveal(question.id)}
                  aria-label={`Show answer for "${question.question}"`}
                  aria-describedby={`question-${question.id}`}
                  aria-expanded={revealedIds.has(question.id)}
                >
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
