import { NextResponse } from 'next/server'
import { markResourceProcessing, markResourceProcessingFailed, processResource, publicResource } from '@/lib/resources'
import { indexResourceEvidence } from '@/lib/evidenceIndex'
import { updateResourceEmbedding } from '@/lib/resources'
import { denyAuditorMutation } from '@/lib/session'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = denyAuditorMutation(_request)
  if (denied) return denied
  const { id } = await context.params
  try {
    const started = await markResourceProcessing(id)
    if (!started) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    if (started.status === 'processing' && started.processingCompletedAt) {
      const session = getNeo4jDriver().session()
      try { await session.run('MATCH ()-[r]->() WHERE r.resourceId = $resourceId DELETE r', { resourceId: id }) } finally { await session.close() }
    }
    const resource = await processResource(id)
    if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    try {
      const indexed = await indexResourceEvidence(resource)
      const updated = await updateResourceEmbedding(id, indexed)
      return NextResponse.json({ resource: publicResource(updated || resource), extractions: resource.extractions || [], connections: resource.connections || [], indexing: indexed })
    } catch (indexError) {
      const updated = await updateResourceEmbedding(id, { count: 0, status: 'failed' })
      return NextResponse.json({ resource: publicResource(updated || resource), extractions: resource.extractions || [], connections: resource.connections || [], indexing: { count: 0, status: 'failed', error: indexError instanceof Error ? indexError.message : 'Evidence indexing failed' } })
    }
  } catch (error) {
    await markResourceProcessingFailed(id, error instanceof Error ? error.message : 'Resource processing failed')
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Resource processing failed' }, { status: 422 })
  }
}
