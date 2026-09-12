import { NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'
import { getNeo4jDriver } from '@/lib/neo4j'
import { getRequestSession } from '@/lib/session'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const limit = Math.min(Number(params.get('limit')) || 220, 300)
  const caseId = params.get('caseId') || ''
  const role = getRequestSession(request).role
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run(`MATCH (n:Entity)
      OPTIONAL MATCH (n)-[r]->(m:Entity)
      WHERE ($role <> 'Auditor' OR (coalesce(n.sensitivity, 'STANDARD') = 'STANDARD' AND (r IS NULL OR coalesce(r.sensitivity, 'STANDARD') = 'STANDARD')))
        AND ($caseId = '' OR r IS NULL OR r.caseId = $caseId OR r.caseId IS NULL)
      RETURN collect(DISTINCT {id:n.id, name:n.name, type:n.type, alias:n.alias, jurisdiction:n.jurisdiction, sensitivity:coalesce(n.sensitivity, 'STANDARD')})[0..$limit] AS nodes,
        collect(DISTINCT {id:coalesce(r.id, n.id + "-" + m.id), source:n.id, target:m.id, type:coalesce(r.type, type(r)), status:coalesce(r.status, "observed"), sources:coalesce(r.sources, [r.source]), sensitivity:coalesce(r.sensitivity, 'STANDARD')})[0..$limit] AS edges`, { limit: neo4j.int(limit), caseId, role })
    const record = result.records[0]
    const nodes = record.get('nodes').filter(Boolean)
    const edges = record.get('edges').filter((edge: { target?: string }) => edge.target).filter((edge: { id: string }, index: number, list: { id: string }[]) => list.findIndex((item) => item.id === edge.id) === index)
    return NextResponse.json({ source: 'neo4j', caseId, nodes, edges })
  } catch (error) {
    return NextResponse.json({ error: 'Neo4j unavailable', detail: error instanceof Error ? error.message : 'Unknown graph error' }, { status: 503 })
  } finally {
    await session.close()
  }
}
