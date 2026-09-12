import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'
import { approveResource, getStoredResource, publicResource, updateConnectionReview } from '@/lib/resources'
import { appendIntegrityEvent } from '@/lib/integrity'
import { denyAuditorMutation } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = denyAuditorMutation(_request)
  if (denied) return denied
  const { id } = await context.params
  const body = (await _request.json().catch(() => null)) as { connectionIds?: string[] } | null
  let resource = await getStoredResource(id)
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  if (resource.status !== 'review' || !resource.connections) return NextResponse.json({ error: 'Process the resource before approving it' }, { status: 409 })
  if (body?.connectionIds?.length) {
    for (const connectionId of body.connectionIds) await updateConnectionReview(id, connectionId, { action: 'approve' })
    resource = await getStoredResource(id)
    if (!resource?.connections) return NextResponse.json({ error: 'Resource connections could not be refreshed' }, { status: 409 })
  }
  const connectionsToWrite = body?.connectionIds?.length ? resource.connections.filter((connection) => body.connectionIds!.includes(connection.id)) : resource.connections.filter((connection) => connection.reviewStatus !== 'rejected')
  const session = getNeo4jDriver().session()
  try {
    await session.run(`UNWIND $connections AS row
      MATCH (a:Entity {id: row.source}), (b:Entity {id: row.target})
      MERGE (a)-[r:RELATES {id: row.id}]->(b)
      SET r.type = row.type, r.status = row.status, r.confidence = row.confidence,
          r.sources = row.evidence, r.resourceId = $resourceId, r.caseId = $caseId, r.sensitivity = 'STANDARD'`, {
      connections: connectionsToWrite, resourceId: resource.id, caseId: resource.caseId,
    })
    const graphEvent = await appendIntegrityEvent({
      resourceId: resource.id,
      caseId: resource.caseId,
      eventType: 'GRAPH_UPDATE_COMMITTED',
      inputHashes: [resource.hash],
      output: { resourceId: resource.id, connections: resource.connections, graphMutation: 'MERGE_RELATES_EDGES' },
    })
    const remaining = resource.connections.filter((connection) => connection.reviewStatus !== 'rejected')
    const approved = remaining.length > 0 && remaining.every((connection) => connection.reviewStatus === 'approved') ? await approveResource(id) : resource
    return NextResponse.json({ resource: approved ? publicResource(approved) : null, approvedConnections: connectionsToWrite.length, graph: 'neo4j', integrityEvent: graphEvent })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Graph approval failed' }, { status: 503 })
  } finally {
    await session.close()
  }
}
