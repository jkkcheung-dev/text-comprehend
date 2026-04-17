import type { DocumentNode, Edge } from "../schemas/index.js";

const IMPORTANCE_RANK: Record<string, number> = {
  core: 3,
  supporting: 2,
  peripheral: 1,
};

/**
 * Deduplicate concepts with the same name (case-insensitive) across documents.
 * Keeps the one with highest importance rank. Replaces IDs in other documents.
 */
export function deduplicateConcepts(documents: DocumentNode[]): {
  documents: DocumentNode[];
  idMap: Map<string, string>; // old ID → canonical ID
} {
  // Group concepts by lowercase name
  const byName = new Map<string, { docIdx: number; conceptIdx: number }[]>();
  for (let di = 0; di < documents.length; di++) {
    for (let ci = 0; ci < documents[di].concepts.length; ci++) {
      const key = documents[di].concepts[ci].name.toLowerCase();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push({ docIdx: di, conceptIdx: ci });
    }
  }

  const idMap = new Map<string, string>();

  for (const [, entries] of byName) {
    if (entries.length <= 1) continue;

    // Find the canonical entry (highest importance)
    let best = entries[0];
    for (let i = 1; i < entries.length; i++) {
      const bestConcept = documents[best.docIdx].concepts[best.conceptIdx];
      const curr = documents[entries[i].docIdx].concepts[entries[i].conceptIdx];
      if ((IMPORTANCE_RANK[curr.importance] ?? 0) > (IMPORTANCE_RANK[bestConcept.importance] ?? 0)) {
        best = entries[i];
      }
    }

    const canonicalId = documents[best.docIdx].concepts[best.conceptIdx].id;

    // Map duplicates and remove them
    for (const entry of entries) {
      if (entry === best) continue;
      const dupId = documents[entry.docIdx].concepts[entry.conceptIdx].id;
      idMap.set(dupId, canonicalId);
    }
  }

  // Remove duplicate concepts from documents
  const result = documents.map((doc) => ({
    ...doc,
    concepts: doc.concepts.filter((c) => !idMap.has(c.id)),
  }));

  return { documents: result, idMap };
}

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
