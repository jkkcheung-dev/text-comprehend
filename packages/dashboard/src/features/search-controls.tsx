type SearchControlsProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onReset: () => void;
};

export function SearchControls({ query, onQueryChange, onReset }: SearchControlsProps) {
  return (
    <div className="flex items-center gap-2 max-w-[280px] w-full">
      <div className="relative flex-1">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search graph..."
          aria-label="Search graph"
          className="w-full bg-surface-raised border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-primary transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono border border-border-default rounded px-1 hidden sm:block">
          ⌘K
        </kbd>
      </div>
      {query && (
        <button type="button" onClick={onReset} className="text-[10px] text-text-muted hover:text-text-primary px-2 py-1 border border-border-default rounded transition-colors">
          Clear
        </button>
      )}
    </div>
  );
}
