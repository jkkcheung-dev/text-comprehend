type SearchControlsProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onReset: () => void;
  disabled?: boolean;
};

export function SearchControls({ query, onQueryChange, onReset, disabled = false }: SearchControlsProps) {
  return (
    <div>
      <label>
        Search graph
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <button type="button" onClick={onReset} disabled={disabled}>
        Clear search
      </button>
    </div>
  );
}
