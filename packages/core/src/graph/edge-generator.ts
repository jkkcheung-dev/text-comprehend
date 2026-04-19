import type { ArgumentNode, DocumentNode, Edge } from "../schemas/index.js";
import type { z } from "zod";
import type { ConceptRelationshipSchema } from "../agents/schemas/index.js";

type ConceptRelationship = z.infer<typeof ConceptRelationshipSchema>;

/**
 * Find the nearest main argument by source line position.
 * Falls back to the first main argument if no source refs exist.
 */
function findNearestMain(
  arg: ArgumentNode,
  mainArgs: ArgumentNode[],
): ArgumentNode | undefined {
  if (mainArgs.length === 0) return undefined;
  if (mainArgs.length === 1) return mainArgs[0];

  const argLine = arg.sourceRefs[0]?.startLine;
  if (argLine == null) return mainArgs[0];

  let best = mainArgs[0];
  let bestDist = Infinity;
  for (const m of mainArgs) {
    const mLine = m.sourceRefs[0]?.startLine;
    if (mLine == null) continue;
    const dist = Math.abs(mLine - argLine);
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return best;
}

function edgeKey(e: Pick<Edge, "source" | "target" | "type">): string {
  return `${e.source}|${e.target}|${e.type}`;
}

export function generateEdges(
  documents: DocumentNode[],
  conceptRelationships: Map<string, ConceptRelationship[]>,
): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();

  function addEdge(edge: Edge): void {
    const key = edgeKey(edge);
    if (!seen.has(key)) {
      seen.add(key);
      edges.push(edge);
    }
  }

  for (const doc of documents) {
    // contains: document → sections
    for (const section of doc.summary.sections) {
      addEdge({ source: doc.id, target: section.id, type: "contains" });
    }
    // contains: document → concepts
    for (const concept of doc.concepts) {
      addEdge({ source: doc.id, target: concept.id, type: "contains" });
    }
    // contains: document → arguments
    for (const arg of doc.arguments) {
      addEdge({ source: doc.id, target: arg.id, type: "contains" });
    }
    // contains: document → questions
    for (const q of doc.questions) {
      addEdge({ source: doc.id, target: q.id, type: "contains" });
    }

    // questions: question → document
    for (const q of doc.questions) {
      addEdge({ source: q.id, target: doc.id, type: "questions" });
    }

    // argument-derived edges: supporting → main, counter → main
    const mainArgs = doc.arguments.filter((a) => a.type === "main");
    for (const arg of doc.arguments) {
      if (arg.type === "supporting" || arg.type === "counter") {
        const edgeType = arg.type === "supporting" ? "supports" : "contradicts";

        const nearest = findNearestMain(arg, mainArgs);
        if (nearest) {
          addEdge({ source: arg.id, target: nearest.id, type: edgeType });
        }
      }
    }

    // concept relationships from extractor
    const rels = conceptRelationships.get(doc.id) ?? [];
    for (const rel of rels) {
      addEdge({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        ...(rel.label != null && { label: rel.label }),
        ...(rel.weight != null && { weight: rel.weight }),
      });
    }
  }

  return edges;
}
