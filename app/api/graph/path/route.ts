import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const from = params.get('from')
  const to = params.get('to')
  const caseId = params.get('caseId') || ''
  if (!from || !to) return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run(`MATCH p = shortestPath((a:Entity {id: $from})-[*..8]-(b:Entity {id: $to}))
      WHERE all(rel IN relationships(p) WHERE $caseId = '' OR rel.caseId = $caseId OR $caseId IN coalesce(rel.caseIds, []))
      RETURN [node IN nodes(p) | node.id] AS nodes,
        [rel IN relationships(p) | {id: coalesce(rel.id, toString(id(rel))), source: startNode(rel).id, target: endNode(rel).id}] AS edges
      LIMIT 1`, { from, to, caseId })
    const record = result.records[0]
    return NextResponse.json({ from, to, caseId, nodes: record?.get('nodes') || [], edges: record?.get('edges') || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Path query failed' }, { status: 503 })
  } finally {
    await session.close()
  }
}
