import styles from "./search-controls.module.css";

type SearchControlsProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onReset: () => void;
  disabled?: boolean;
};

export function SearchControls({ query, onQueryChange, onReset, disabled = false }: SearchControlsProps) {
  return (
    <div className={styles.wrapper}>
      <input
        type="search"
        className={styles.input}
        value={query}
        disabled={disabled}
        placeholder="Search graph..."
        aria-label="Search graph"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <button type="button" className={styles.clearButton} onClick={onReset} disabled={disabled}>
        Clear
      </button>
    </div>
  );
}
