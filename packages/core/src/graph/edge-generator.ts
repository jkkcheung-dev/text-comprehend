import type { DocumentNode, Edge } from "../schemas/index.js";
import type { z } from "zod";
import type { ConceptRelationshipSchema } from "../agents/schemas/index.js";

type ConceptRelationship = z.infer<typeof ConceptRelationshipSchema>;

export function generateEdges(
  documents: DocumentNode[],
  conceptRelationships: Map<string, ConceptRelationship[]>,
): Edge[] {
  const edges: Edge[] = [];

  for (const doc of documents) {
    // contains: document → sections
    for (const section of doc.summary.sections) {
      edges.push({ source: doc.id, target: section.id, type: "contains" });
    }
    // contains: document → concepts
    for (const concept of doc.concepts) {
      edges.push({ source: doc.id, target: concept.id, type: "contains" });
    }
    // contains: document → arguments
    for (const arg of doc.arguments) {
      edges.push({ source: doc.id, target: arg.id, type: "contains" });
    }
    // contains: document → questions
    for (const q of doc.questions) {
      edges.push({ source: doc.id, target: q.id, type: "contains" });
    }

    // questions: question → document
    for (const q of doc.questions) {
      edges.push({ source: q.id, target: doc.id, type: "questions" });
    }

    // argument-derived edges: supporting → main, counter → main
    const mainArgs = doc.arguments.filter((a) => a.type === "main");
    for (const arg of doc.arguments) {
      if (arg.type === "supporting") {
        for (const main of mainArgs) {
          edges.push({ source: arg.id, target: main.id, type: "supports" });
        }
      } else if (arg.type === "counter") {
        for (const main of mainArgs) {
          edges.push({ source: arg.id, target: main.id, type: "contradicts" });
        }
      }
    }

    // concept relationships from extractor
    const rels = conceptRelationships.get(doc.id) ?? [];
    for (const rel of rels) {
      edges.push({
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
