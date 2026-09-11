import neo4j from 'neo4j-driver'
import { getEmbeddingProvider } from '@/lib/embeddings'
import { getNeo4jDriver } from '@/lib/neo4j'
import type { StoredResource } from '@/lib/resources'

function chunksFor(text: string) {
  const chunks: string[] = []
  let current = ''
  for (const segment of text.split(/\n\s*\n|(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean)) {
    if (current && `${current} ${segment}`.length > 1200) {
      chunks.push(current)
      current = ''
    }
    current = current ? `${current} ${segment}` : segment
  }
  if (current) chunks.push(current)
  return chunks.length ? chunks : [text.slice(0, 1200)]
}

export async function indexResourceEvidence(resource: StoredResource) {
  const text = resource.text?.trim()
  if (!text) return { count: 0, status: 'empty' as const }
  const chunks = chunksFor(text)
  const embeddings = await getEmbeddingProvider().embed(chunks)
  const session = getNeo4jDriver().session()
  try {
    await session.run(`CREATE VECTOR INDEX evidenceEmbeddings IF NOT EXISTS FOR (e:EvidenceChunk) ON (e.embedding)
      OPTIONS { indexConfig: { \`vector.dimensions\`: $dimensions, \`vector.similarity_function\`: 'cosine' } }`, { dimensions: neo4j.int(embeddings[0]?.length || 1536) })
    await session.run(`UNWIND $rows AS row
      MERGE (chunk:EvidenceChunk {id: row.id})
      SET chunk.text = row.text, chunk.sourceId = row.sourceId, chunk.sourceType = row.sourceType,
        chunk.caseId = row.caseId, chunk.resourceId = row.resourceId, chunk.embedding = row.embedding`, {
      rows: chunks.map((chunk, index) => ({ id: `${resource.id}-CHUNK-${index + 1}`, text: chunk, sourceId: resource.id, sourceType: resource.type, caseId: resource.caseId, resourceId: resource.id, embedding: embeddings[index] })),
    })
    return { count: chunks.length, status: 'indexed' as const }
  } finally {
    await session.close()
  }
}
