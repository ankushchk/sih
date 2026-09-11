import { NextResponse } from 'next/server'
import { createResource, listStoredResources, publicResource } from '@/lib/resources'

export const runtime = 'nodejs'

export async function GET() {
  const resources = await listStoredResources()
  return NextResponse.json({ resources: resources.map(publicResource) })
}

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file')
  const caseId = String(form.get('caseId') || 'CASE-1004')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file field is required' }, { status: 400 })
  if (!['application/pdf', 'text/csv', 'application/json', 'text/plain'].includes(file.type) && !/\.(pdf|csv|json|txt)$/i.test(file.name)) return NextResponse.json({ error: 'Only PDF, CSV, JSON and TXT files are supported' }, { status: 415 })
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'Files must be smaller than 15 MB' }, { status: 413 })
  const resource = await createResource(file, caseId, 'Ankush Chauhan')
  return NextResponse.json({ resource: publicResource(resource) }, { status: 201 })
}
