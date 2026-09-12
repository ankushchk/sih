import { NextResponse } from 'next/server'
import { createManualResource, publicResource } from '@/lib/resources'
import { denyAuditorMutation, getRequestSession } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const denied = denyAuditorMutation(request)
  if (denied) return denied
  const body = await request.json().catch(() => null) as { caseId?: string; source?: string; target?: string; sourceName?: string; targetName?: string; type?: string; confidence?: number; note?: string } | null
  if (!body?.caseId || !body.source || !body.target || !body.sourceName || !body.targetName || !body.type || !body.note) return NextResponse.json({ error: 'Relationship note fields are required' }, { status: 400 })
  const resource = await createManualResource({ caseId: body.caseId, source: body.source, target: body.target, sourceName: body.sourceName, targetName: body.targetName, type: body.type, confidence: body.confidence ?? 0.5, note: body.note, addedBy: getRequestSession(request).userId })
  return NextResponse.json({ resource: publicResource(resource) }, { status: 201 })
}
