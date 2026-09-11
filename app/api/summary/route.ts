import neo4j from 'neo4j-driver'
import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'
import { listStoredResources } from '@/lib/resources'

export const runtime = 'nodejs'

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : neo4j.isInt(value) ? value.toNumber() : Number(value || 0)
}

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get('caseId')
  if (!caseId) return NextResponse.json({ error: 'A caseId is required' }, { status: 400 })

  const resources = (await listStoredResources(caseId)).filter((resource) => resource.caseId === caseId || resource.caseId === 'MULTI-CASE')
  const processed = resources.filter((resource) => resource.status === 'processed' || resource.status === 'review' || resource.status === 'approved')
  const approved = resources.filter((resource) => resource.status === 'approved')
  const entityIds = new Set(resources.flatMap((resource) => resource.extractions?.map((extraction) => extraction.entityId) || []))
  const activity = [...resources]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 6)
    .map((resource) => ({
      id: resource.id,
      time: resource.timestamp,
      title: resource.status === 'approved' ? 'Graph connections approved' : resource.status === 'review' ? 'Extraction ready for review' : 'Evidence record ingested',
      detail: `${resource.filename} · ${resource.entities} entities · ${resource.relationships} relationships`,
      tone: resource.status === 'approved' ? 'green' : resource.status === 'review' ? 'blue' : 'purple',
    }))

  const session = getNeo4jDriver().session()
  try {
    const caseResult = await session.run(`MATCH (c:Case {id: $caseId}) RETURN c.id AS id, c.title AS title, coalesce(c.status, 'ACTIVE') AS status, coalesce(c.priority, 'UNSPECIFIED') AS priority, coalesce(c.jurisdiction, 'UNSPECIFIED') AS jurisdiction`, { caseId })
    const caseCountResult = await session.run(`MATCH (c:Case) RETURN count(c) AS total, count(CASE WHEN coalesce(c.status, 'ACTIVE') = 'ACTIVE' THEN 1 END) AS active`)
    const graphResult = await session.run(`OPTIONAL MATCH (a:Entity)-[r]-(b:Entity)
        WHERE ($caseId = '' OR r IS NULL OR r.caseId = $caseId OR r.caseId IS NULL)
        RETURN count(DISTINCT r) AS relationshipCount,
          count(DISTINCT CASE WHEN r.status = 'predicted' THEN r END) AS openLeads,
          count(DISTINCT CASE WHEN r.resourceId IS NOT NULL THEN r END) AS inGraph` , { caseId })
    const leadResult = await session.run(`MATCH (n:Entity)-[r]-(other:Entity)
        WHERE ($caseId = '' OR r.caseId = $caseId OR r.caseId IS NULL)
        WITH n, count(DISTINCT r) AS degree, count(DISTINCT coalesce(r.caseId, 'canonical')) AS caseCount, collect(DISTINCT r.status) AS statuses
        RETURN n.id AS id, n.name AS name, n.role AS role, degree, caseCount, statuses
        ORDER BY degree DESC, caseCount DESC LIMIT 3`, { caseId })

    const caseRecord = caseResult.records[0]
    if (!caseRecord) return NextResponse.json({ error: 'Case not found', caseId }, { status: 404 })
    const caseCounts = caseCountResult.records[0]
    const graph = graphResult.records[0]
    const leads = leadResult.records.map((record, index) => {
      const degree = numberValue(record.get('degree'))
      const caseCount = numberValue(record.get('caseCount'))
      const score = Math.min(0.99, Math.max(0.01, degree / Math.max(degree + 2, 1) + Math.min(caseCount, 4) * 0.04))
      const statuses = (record.get('statuses') as string[]).filter(Boolean)
      return {
        rank: String(index + 1).padStart(2, '0'),
        name: record.get('name') as string,
        id: record.get('id') as string,
        label: caseCount > 1 ? 'Potential intermediary' : statuses.includes('predicted') ? 'Predicted lead' : 'High-connectivity entity',
        score: score.toFixed(2),
        reason: `${degree} connected relationship${degree === 1 ? '' : 's'} across ${caseCount} case context${caseCount === 1 ? '' : 's'}.`,
        signals: [`${degree} graph relationships`, `${caseCount} case context${caseCount === 1 ? '' : 's'}`],
      }
    })
    const evidenceRecords = resources.length
    const processedRecords = processed.length
    return NextResponse.json({
      caseId,
      case: {
        id: caseRecord.get('id'),
        title: caseRecord.get('title'),
        status: caseRecord.get('status'),
        priority: caseRecord.get('priority'),
        jurisdiction: caseRecord.get('jurisdiction'),
      },
      metrics: {
        activeCases: numberValue(caseCounts.get('active')),
        evidenceRecords,
        entitiesResolved: entityIds.size,
        openLeads: numberValue(graph.get('openLeads')),
        processedRecords,
        processingPercent: evidenceRecords ? Math.round((processedRecords / evidenceRecords) * 100) : 0,
        pipeline: {
          ingested: evidenceRecords,
          extracted: processedRecords,
          resolved: entityIds.size,
          inGraph: approved.reduce((sum, resource) => sum + resource.relationships, 0) || numberValue(graph.get('inGraph')),
        },
      },
      lead: leads[0] || null,
      leads,
      activity,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Workspace summary unavailable', caseId }, { status: 503 })
  } finally {
    await session.close()
  }
}
