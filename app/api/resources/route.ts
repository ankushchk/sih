import { NextResponse } from 'next/server'
import { createResource, listStoredResources, publicResource } from '@/lib/resources'
import { CURRENT_USER } from '@/lib/currentUser'
import { denyAuditorMutation } from '@/lib/session'
import { getRequestSession } from '@/lib/session'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const caseId = new URL(request.url).searchParams.get('caseId') || undefined
    const resources = await listStoredResources(caseId)
    if (caseId === 'CASE-EPSTEIN' && resources.length === 0) {
      const session = getNeo4jDriver().session()
      try {
        const result = await session.run(`MATCH (doc:EvidenceChunk {caseId: $caseId})
          RETURN doc.id AS id, doc.sourceId AS sourceId, doc.sourceType AS sourceType, doc.text AS text,
            doc.dateStart AS dateStart, doc.dateEnd AS dateEnd LIMIT 100`, { caseId })
        return NextResponse.json({ resources: result.records.map((record) => ({ id: record.get('id'), filename: `${record.get('sourceId')}.txt`, type: record.get('sourceType') || 'CORPUS DOCUMENT', title: record.get('sourceId'), caseId, timestamp: record.get('dateStart') || record.get('dateEnd') || 'Corpus record', excerpt: String(record.get('text') || '').replace(/\s+/g, ' ').slice(0, 280), hash: `external:${record.get('sourceId')}`, integrity: 'unverified', size: 'Corpus record', status: 'processed', entities: 0, relationships: 0, addedBy: 'Epstein document corpus' })) })
      } finally {
        await session.close()
      }
    }
    return NextResponse.json({ resources: resources.map(publicResource) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Resource storage is unavailable', hint: 'Configure persistent resource storage for the deployed backend.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const denied = denyAuditorMutation(request)
  if (denied) return denied
  const form = await request.formData()
  const file = form.get('file')
  const caseId = String(form.get('caseId') || 'CASE-1004')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file field is required' }, { status: 400 })
  if (!['application/pdf', 'text/csv', 'application/json', 'text/plain'].includes(file.type) && !/\.(pdf|csv|json|txt)$/i.test(file.name)) return NextResponse.json({ error: 'Only PDF, CSV, JSON and TXT files are supported' }, { status: 415 })
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Files must be smaller than 15 MB' }, { status: 413 })
  const session = getNeo4jDriver().session()
  try {
    const caseResult = await session.run('MATCH (c:Case {id: $caseId}) RETURN c.assignedInvestigator AS assignedInvestigator', { caseId })
    const assignedInvestigator = caseResult.records[0]?.get('assignedInvestigator') as string | null
    const caller = getRequestSession(request)
    if (!assignedInvestigator || (caller.role !== 'Supervisor' && caller.userId !== assignedInvestigator)) return NextResponse.json({ error: 'You are not assigned to this case' }, { status: 403 })
  } finally {
    await session.close()
  }
  const resource = await createResource(file, caseId, CURRENT_USER.name)
  return NextResponse.json({ resource: publicResource(resource) }, { status: 201 })
}
