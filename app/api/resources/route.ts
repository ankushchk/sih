import { NextResponse } from 'next/server'
import { createResource, listStoredResources, publicResource } from '@/lib/resources'
import { CURRENT_USER } from '@/lib/currentUser'
import { denyAuditorMutation } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get('caseId') || undefined
  const resources = await listStoredResources(caseId)
  return NextResponse.json({ resources: resources.map(publicResource) })
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
  const resource = await createResource(file, caseId, CURRENT_USER.name)
  return NextResponse.json({ resource: publicResource(resource) }, { status: 201 })
}
