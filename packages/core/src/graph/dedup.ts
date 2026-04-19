import type { DocumentNode, Edge } from "../schemas/index.js";

/**
 * Find node IDs that appear in no edges (neither as source nor target).
 */
export function findOrphans(documents: DocumentNode[], edges: Edge[]): string[] {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const allIds: string[] = [];
  for (const doc of documents) {
    allIds.push(doc.id);
    for (const s of doc.summary.sections) allIds.push(s.id);
    for (const c of doc.concepts) allIds.push(c.id);
    for (const a of doc.arguments) allIds.push(a.id);
    for (const q of doc.questions) allIds.push(q.id);
  }

  return allIds.filter((id) => !connectedIds.has(id));
}
