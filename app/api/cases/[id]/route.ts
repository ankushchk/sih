import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run(`MATCH (c:Case {id: $id})
      OPTIONAL MATCH (c)<-[:APPEARED_IN]-(entity:Entity)
      RETURN c.id AS id, c.title AS title, coalesce(c.status, 'ACTIVE') AS status,
        coalesce(c.priority, 'UNSPECIFIED') AS priority,
        coalesce(c.jurisdiction, 'UNSPECIFIED') AS jurisdiction,
        count(DISTINCT entity) AS entityCount`, { id })
    if (!result.records[0]) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    const record = result.records[0]
    return NextResponse.json({ case: {
      id: record.get('id'), title: record.get('title'), status: record.get('status'),
      priority: record.get('priority'), jurisdiction: record.get('jurisdiction'),
      entityCount: record.get('entityCount').toNumber(),
    } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Case unavailable' }, { status: 503 })
  } finally {
    await session.close()
  }
}
