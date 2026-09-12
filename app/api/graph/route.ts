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
    const result = await session.run(`CALL {
        MATCH (n:Entity)-[r]->(m:Entity)
        WHERE ($role <> 'Auditor' OR (coalesce(n.sensitivity, 'STANDARD') = 'STANDARD' AND coalesce(m.sensitivity, 'STANDARD') = 'STANDARD' AND coalesce(r.sensitivity, 'STANDARD') = 'STANDARD'))
          AND ($caseId = '' OR r.caseId = $caseId OR $caseId IN coalesce(r.caseIds, []))
        WITH n, m, r LIMIT $limit
        RETURN collect(DISTINCT {id:n.id, name:n.name, type:n.type, alias:n.alias, jurisdiction:n.jurisdiction, sensitivity:coalesce(n.sensitivity, 'STANDARD')}) + collect(DISTINCT {id:m.id, name:m.name, type:m.type, alias:m.alias, jurisdiction:m.jurisdiction, sensitivity:coalesce(m.sensitivity, 'STANDARD')}) AS rawNodes
      }
      CALL {
        MATCH (n:Entity)-[r]->(m:Entity)
        WHERE ($role <> 'Auditor' OR (coalesce(n.sensitivity, 'STANDARD') = 'STANDARD' AND coalesce(m.sensitivity, 'STANDARD') = 'STANDARD' AND coalesce(r.sensitivity, 'STANDARD') = 'STANDARD'))
          AND ($caseId = '' OR r.caseId = $caseId OR $caseId IN coalesce(r.caseIds, []))
        WITH n, m, r LIMIT $limit
        RETURN collect(DISTINCT {id:coalesce(r.id, n.id + "-" + m.id), source:n.id, target:m.id, type:coalesce(r.type, type(r)), status:coalesce(r.status, "observed"), sources:coalesce(r.sources, [r.source]), sensitivity:coalesce(r.sensitivity, 'STANDARD')}) AS edges
      }
      RETURN rawNodes, edges`, { limit: neo4j.int(limit), caseId, role })
    const record = result.records[0]
    const nodes = record.get('rawNodes').filter((node: { id: string }, index: number, list: { id: string }[]) => list.findIndex((item) => item.id === node.id) === index).slice(0, limit)
    const edges = record.get('edges').filter((edge: { target?: string }) => edge.target).filter((edge: { id: string }, index: number, list: { id: string }[]) => list.findIndex((item) => item.id === edge.id) === index).slice(0, limit)
    return NextResponse.json({ source: 'neo4j', caseId, nodes, edges })
  } catch (error) {
    return NextResponse.json({ error: 'Neo4j unavailable', detail: error instanceof Error ? error.message : 'Unknown graph error' }, { status: 503 })
  } finally {
    await session.close()
  }
}
