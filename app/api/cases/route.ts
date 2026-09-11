import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'

export async function GET() {
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run(`MATCH (c:Case)
      OPTIONAL MATCH (resource:Resource {caseId: c.id})
      RETURN c.id AS id, c.title AS title, coalesce(c.status, 'ACTIVE') AS status,
        coalesce(c.priority, 'UNSPECIFIED') AS priority,
        coalesce(c.jurisdiction, 'UNSPECIFIED') AS jurisdiction,
        count(resource) AS evidenceCount
      ORDER BY c.id`)
    return NextResponse.json({ cases: result.records.map((record) => ({
      id: record.get('id'),
      title: record.get('title'),
      status: record.get('status'),
      priority: record.get('priority'),
      jurisdiction: record.get('jurisdiction'),
      evidenceCount: record.get('evidenceCount').toNumber(),
    })) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cases unavailable' }, { status: 503 })
  } finally {
    await session.close()
  }
}
