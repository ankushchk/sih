import type { Session } from 'neo4j-driver'
import neo4j from 'neo4j-driver'
import { getEmbeddingProvider } from '@/lib/embeddings'

export type CanonicalEntity = { id: string; name: string; alias?: string; type: string }
export type GraphFact = {
  subject: string
  subjectId: string
  predicate: string
  object: string
  objectId: string
  status: string
  confidence?: number
  caseId?: string
  timestamp?: string
  sources: string[]
}
export type EvidenceMatch = {
  id: string
  text: string
  sourceId: string
  sourceType: string
  caseId?: string
  score: number
}

export async function loadCanonicalEntities(session: Session): Promise<CanonicalEntity[]> {
  const result = await session.run('MATCH (n:Entity) RETURN n.id AS id, n.name AS name, n.alias AS alias, n.type AS type')
  return result.records.map((record) => ({
    id: record.get('id') as string,
    name: record.get('name') as string,
    alias: (record.get('alias') as string | null) ?? undefined,
    type: record.get('type') as string,
  }))
}

export function findMentionedEntities(question: string, entities: CanonicalEntity[]): CanonicalEntity[] {
  const lowered = question.toLowerCase()
  return entities.filter((entity) => [entity.name, entity.alias, entity.id]
    .filter(Boolean)
    .some((candidate) => lowered.includes(candidate!.toLowerCase())))
}

export async function getSubgraphFacts(session: Session, entityIds: string[], caseId: string): Promise<GraphFact[]> {
  if (!entityIds.length) return []
  const result = await session.run(
    `MATCH (a:Entity)-[r]-(b:Entity)
     WHERE (a.id IN $ids OR b.id IN $ids)
       AND ($caseId = '' OR r.caseId = $caseId OR r.caseId IS NULL)
     RETURN DISTINCT a.id AS subjectId, a.name AS subject, type(r) AS predicate,
       b.id AS objectId, b.name AS object, coalesce(r.status, 'observed') AS status,
       r.confidence AS confidence, r.caseId AS caseId, r.timestamp AS timestamp,
       coalesce(r.sources, CASE WHEN r.source IS NULL THEN [] ELSE [r.source] END) AS sources
     LIMIT 100`,
    { ids: entityIds, caseId },
  )
  return result.records.map((record) => ({
    subjectId: record.get('subjectId') as string,
    subject: record.get('subject') as string,
    predicate: record.get('predicate') as string,
    objectId: record.get('objectId') as string,
    object: record.get('object') as string,
    status: record.get('status') as string,
    confidence: record.get('confidence') == null ? undefined : Number(record.get('confidence')),
    caseId: (record.get('caseId') as string | null) ?? undefined,
    timestamp: (record.get('timestamp') as string | null) ?? undefined,
    sources: (record.get('sources') as string[]) ?? [],
  }))
}

export async function searchEvidence(session: Session, question: string, caseId: string, topK = 5): Promise<EvidenceMatch[]> {
  try {
    const provider = getEmbeddingProvider()
    const [queryEmbedding] = await provider.embed([question])
    const result = await session.run(
      `CALL db.index.vector.queryNodes('evidenceEmbeddings', $topK, $embedding)
       YIELD node, score
       WHERE $caseId = '' OR node.caseId = $caseId OR node.caseId IS NULL
       RETURN node.id AS id, node.text AS text, node.sourceId AS sourceId,
         node.sourceType AS sourceType, node.caseId AS caseId, score`,
      { topK, embedding: queryEmbedding, caseId },
    )
    if (result.records.length) return result.records.map((record) => ({ id: record.get('id') as string, text: record.get('text') as string, sourceId: record.get('sourceId') as string, sourceType: record.get('sourceType') as string, caseId: (record.get('caseId') as string | null) ?? undefined, score: Number(record.get('score')) }))
  } catch (error) {
    console.warn('Vector evidence search unavailable; using full-text retrieval:', error instanceof Error ? error.message : error)
  }
  const terms = question.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter((term) => term.length > 2).slice(0, 12)
  if (!terms.length) return []
  const result = await session.run(`CALL db.index.fulltext.queryNodes('evidenceText', $query)
    YIELD node, score
    WHERE $caseId = '' OR node.caseId = $caseId OR node.caseId IS NULL
    RETURN node.id AS id, node.text AS text, node.sourceId AS sourceId, node.sourceType AS sourceType, node.caseId AS caseId, score
    LIMIT $topK`, { query: terms.join(' OR '), caseId, topK: neo4j.int(topK) })
  return result.records.map((record) => ({ id: record.get('id') as string, text: record.get('text') as string, sourceId: record.get('sourceId') as string, sourceType: record.get('sourceType') as string, caseId: (record.get('caseId') as string | null) ?? undefined, score: Number(record.get('score')) }))
}

export function buildContext(facts: GraphFact[], evidence: EvidenceMatch[], caseId: string): string {
  const factLines = facts.map((fact) => {
    const metadata = [fact.status, fact.caseId, fact.timestamp, fact.confidence == null ? '' : `${Math.round(fact.confidence * 100)}%`].filter(Boolean).join('; ')
    return `- ${fact.subject} (${fact.subjectId}) --${fact.predicate}(${metadata})--> ${fact.object} (${fact.objectId}) [sources: ${fact.sources.length ? fact.sources.join(', ') : 'none recorded'}]`
  })
  const evidenceLines = evidence.map((item) => `- [${item.sourceId}] (${item.sourceType}${item.caseId ? `; ${item.caseId}` : ''}): ${item.text}`)
  return [`CASE SCOPE: ${caseId || 'all authorized data'}`, 'GRAPH FACTS:', factLines.length ? factLines.join('\n') : '(no direct graph relationships found)', '', 'EVIDENCE EXCERPTS:', evidenceLines.length ? evidenceLines.join('\n') : '(no matching evidence excerpts found)'].join('\n')
}
