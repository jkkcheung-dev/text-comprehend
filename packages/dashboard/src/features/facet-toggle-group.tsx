import styles from "./facet-toggle-group.module.css";
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

const facetColors: Record<keyof GraphFacetState, string> = {
  documents: "var(--color-document)",
  concepts: "var(--color-concept)",
  arguments: "var(--color-argument)",
  questions: "var(--color-question)",
};

export function FacetToggleGroup({ facets, onFacetChange, disabled = false }: FacetToggleGroupProps) {
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>Visible Node Types</legend>
      {facetKeys.map((facetKey) => (
        <label key={facetKey} className={styles.label}>
          <span className={styles.colorDot} style={{ background: facetColors[facetKey] }} />
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
