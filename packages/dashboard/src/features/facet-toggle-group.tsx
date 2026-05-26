import type { GraphFacetState } from "./graph-view-model";

type FacetToggleGroupProps = {
  facets: GraphFacetState;
  onFacetChange: (facet: keyof GraphFacetState, nextValue: boolean) => void;
  disabled?: boolean;
};

const facetLabels = {
  documents: "Documents",
  concepts: "Concepts",
  arguments: "Arguments",
  questions: "Questions",
} satisfies Record<keyof GraphFacetState, string>;

const facetKeys = Object.keys(facetLabels) as Array<keyof GraphFacetState>;

export function FacetToggleGroup({ facets, onFacetChange, disabled = false }: FacetToggleGroupProps) {
  return (
    <fieldset disabled={disabled}>
      <legend>Visible node types</legend>
      {facetKeys.map((facetKey) => (
        <label key={facetKey}>
          <input
            type="checkbox"
            checked={facets[facetKey]}
            disabled={disabled}
            onChange={(event) => onFacetChange(facetKey, event.target.checked)}
          />
          {facetLabels[facetKey]}
        </label>
      ))}
    </fieldset>
  );
}
