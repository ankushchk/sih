import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const focusId = params.get('focusId')
  const caseId = params.get('caseId') || ''
  if (!focusId) return NextResponse.json({ error: 'focusId is required' }, { status: 400 })
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run(`MATCH p = (focus:Entity {id: $focusId})-[*1..2]-(other:Entity)
      UNWIND relationships(p) AS rel
      WITH focus, other, rel
      WHERE $caseId = '' OR rel.caseId = $caseId OR $caseId IN coalesce(rel.caseIds, [])
      WITH collect(DISTINCT focus) + collect(DISTINCT other) AS rawNodes, collect(DISTINCT rel) AS rels
      RETURN [node IN rawNodes | {id: node.id, name: node.name, type: node.type, alias: node.alias, jurisdiction: node.jurisdiction, sensitivity: coalesce(node.sensitivity, 'STANDARD')}] AS nodes,
        [rel IN rels | {id: coalesce(rel.id, toString(id(rel))), source: startNode(rel).id, target: endNode(rel).id, type: coalesce(rel.type, type(rel)), status: coalesce(rel.status, 'observed'), sources: coalesce(rel.sources, [rel.source]), sensitivity: coalesce(rel.sensitivity, 'STANDARD')}] AS edges`, { focusId, caseId })
    const record = result.records[0]
    return NextResponse.json({ source: 'neo4j', focusId, nodes: record?.get('nodes') || [], edges: record?.get('edges') || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Neighborhood unavailable' }, { status: 503 })
  } finally {
    await session.close()
  }
}
