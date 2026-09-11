import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'
import { appendIntegrityEvent } from '@/lib/integrity'
import { publicResource, updateConnectionReview } from '@/lib/resources'

export const runtime = 'nodejs'

export async function POST(request: Request, context: { params: Promise<{ id: string; connectionId: string }> }) {
  const { id, connectionId } = await context.params
  const body = (await request.json().catch(() => null)) as { action?: 'approve' | 'reject' | 'update'; type?: string; confidence?: number } | null
  const action = body?.action
  if (!action) return NextResponse.json({ error: 'An action is required' }, { status: 400 })
  const result = await updateConnectionReview(id, connectionId, { ...body, action })
  if (!result) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  if (body.action !== 'approve') return NextResponse.json({ resource: publicResource(result.resource), connection: result.connection })

  const session = getNeo4jDriver().session()
  try {
    await session.run(`MATCH (a:Entity {id: $source}), (b:Entity {id: $target})
      MERGE (a)-[r:RELATES {id: $id}]->(b)
      SET r.type = $type, r.status = 'observed', r.confidence = $confidence,
        r.sources = $evidence, r.resourceId = $resourceId, r.caseId = $caseId`, {
      id: result.connection.id, source: result.connection.source, target: result.connection.target,
      type: result.connection.type, confidence: result.connection.confidence,
      evidence: result.connection.evidence, resourceId: id, caseId: result.resource.caseId,
    })
    const event = await appendIntegrityEvent({ resourceId: id, caseId: result.resource.caseId, eventType: 'CONNECTION_APPROVED', inputHashes: [result.resource.hash], output: result.connection })
    return NextResponse.json({ resource: publicResource(result.resource), connection: result.connection, integrityEvent: event })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Connection approval failed' }, { status: 503 })
  } finally {
    await session.close()
  }
}
