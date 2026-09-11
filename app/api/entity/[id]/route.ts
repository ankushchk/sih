import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run('MATCH (n:Entity {id: $id}) OPTIONAL MATCH (n)-[r]-(m) RETURN n, collect({id:m.id, name:m.name, type:m.type, relation:type(r), status:r.status, sources:r.sources}) AS connections', { id })
    if (!result.records.length) return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    const record = result.records[0]
    return NextResponse.json({ node: record.get('n').properties, connections: record.get('connections') })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Neo4j unavailable' }, { status: 503 })
  } finally {
    await session.close()
  }
}
