import { NextResponse } from 'next/server'
import { getStoredResource, publicResource } from '@/lib/resources'

export const runtime = 'nodejs'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const resource = await getStoredResource(id)
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  const response = publicResource(resource) as Record<string, unknown>
  if (new URL(request.url).searchParams.get('includeText') === '1' && resource.text) response.text = resource.text
  return NextResponse.json({ resource: response })
}
