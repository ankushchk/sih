import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'
import { approveResource, getStoredResource, publicResource } from '@/lib/resources'
import { appendIntegrityEvent } from '@/lib/integrity'

export const runtime = 'nodejs'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const resource = await getStoredResource(id)
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  if (resource.status !== 'review' || !resource.connections) return NextResponse.json({ error: 'Process the resource before approving it' }, { status: 409 })
  const session = getNeo4jDriver().session()
  try {
    await session.run(`UNWIND $connections AS row
      MATCH (a:Entity {id: row.source}), (b:Entity {id: row.target})
      MERGE (a)-[r:RELATES {id: row.id}]->(b)
      SET r.type = row.type, r.status = row.status, r.confidence = row.confidence,
          r.sources = row.evidence, r.resourceId = $resourceId, r.caseId = $caseId`, {
      connections: resource.connections, resourceId: resource.id, caseId: resource.caseId,
    })
    const graphEvent = await appendIntegrityEvent({
      resourceId: resource.id,
      caseId: resource.caseId,
      eventType: 'GRAPH_UPDATE_COMMITTED',
      inputHashes: [resource.hash],
      output: { resourceId: resource.id, connections: resource.connections, graphMutation: 'MERGE_RELATES_EDGES' },
    })
    const approved = await approveResource(id)
    return NextResponse.json({ resource: approved ? publicResource(approved) : null, approvedConnections: resource.connections.length, graph: 'neo4j', integrityEvent: graphEvent })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Graph approval failed' }, { status: 503 })
  } finally {
    await session.close()
  }
}
