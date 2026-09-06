import { NextResponse } from 'next/server'
import neo4j from 'neo4j-driver'
import { getNeo4jDriver } from '../../../lib/neo4j'

export async function GET(request: Request) {
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 220, 300)
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run(`MATCH (n:Entity) OPTIONAL MATCH (n)-[r]->(m:Entity) RETURN collect(DISTINCT {id:n.id, name:n.name, type:n.type, alias:n.alias, jurisdiction:n.jurisdiction})[0..$limit] AS nodes, collect(DISTINCT {id:coalesce(r.id, n.id + "-" + m.id), source:n.id, target:m.id, type:coalesce(r.type, type(r)), status:coalesce(r.status, "observed"), sources:coalesce(r.sources, [r.source])})[0..$limit] AS edges`, { limit: neo4j.int(limit) })
    const record = result.records[0]
    const nodes = record.get('nodes').filter(Boolean)
    const edges = record.get('edges').filter((edge: { target?: string }) => edge.target).filter((edge: { id: string }, index: number, list: { id: string }[]) => list.findIndex((item) => item.id === edge.id) === index)
    return NextResponse.json({ source: 'neo4j', nodes, edges })
  } catch (error) {
    return NextResponse.json({ error: 'Neo4j unavailable', detail: error instanceof Error ? error.message : 'Unknown graph error' }, { status: 503 })
  } finally {
    await session.close()
  }
}
