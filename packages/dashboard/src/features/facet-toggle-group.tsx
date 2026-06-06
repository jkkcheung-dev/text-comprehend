import type { GraphFacetState } from "./graph-view-model";

const facetKeys = ["concepts", "arguments", "questions"] as const;

const facetConfig: Record<(typeof facetKeys)[number], { label: string; color: string }> = {
  concepts: { label: "Concepts", color: "var(--color-facet-concept)" },
  arguments: { label: "Arguments", color: "var(--color-facet-argument)" },
  questions: { label: "Questions", color: "var(--color-facet-question)" },
};

type FacetToggleGroupProps = {
  facets: GraphFacetState;
  onFacetChange: (facet: keyof GraphFacetState, value: boolean) => void;
};

export function FacetToggleGroup({ facets, onFacetChange }: FacetToggleGroupProps) {
  return (
    <fieldset className="border-none flex flex-col gap-1.5">
      <legend className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
        Visible Node Types
      </legend>
      {facetKeys.map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: facetConfig[key].color }} />
          <input
            type="checkbox"
            checked={facets[key]}
            onChange={(e) => onFacetChange(key, e.target.checked)}
            className="accent-accent-primary w-3.5 h-3.5"
          />
          {facetConfig[key].label}
        </label>
      ))}
    </fieldset>
  );
}
