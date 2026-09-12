import { NextResponse } from 'next/server'
import { getStoredResource, publicResource } from '@/lib/resources'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const resource = await getStoredResource(id)
  if (!resource && id.startsWith('EP-DOC-')) {
    const session = getNeo4jDriver().session()
    try {
      const result = await session.run(`MATCH (doc:EvidenceChunk {id: $id}) RETURN doc.id AS id, doc.sourceId AS sourceId, doc.sourceType AS sourceType, doc.text AS text, doc.caseId AS caseId, doc.dateStart AS dateStart, doc.dateEnd AS dateEnd`, { id })
      const record = result.records[0]
      if (!record) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      const text = String(record.get('text') || '')
      return NextResponse.json({ resource: { id, filename: `${record.get('sourceId')}.txt`, type: record.get('sourceType') || 'CORPUS DOCUMENT', title: record.get('sourceId'), caseId: record.get('caseId'), timestamp: record.get('dateStart') || record.get('dateEnd') || 'Corpus record', excerpt: text.replace(/\s+/g, ' ').slice(0, 280), text, hash: `external:${record.get('sourceId')}`, integrity: 'unverified', size: 'Corpus record', status: 'processed', entities: 0, relationships: 0, addedBy: 'Epstein document corpus' } })
    } finally {
      await session.close()
    }
  }
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  const response = publicResource(resource) as Record<string, unknown>
  if (new URL(request.url).searchParams.get('includeText') === '1' && resource.text) response.text = resource.text
  return NextResponse.json({ resource: response })
}
