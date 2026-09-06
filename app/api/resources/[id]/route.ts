import { NextResponse } from 'next/server'
import { getStoredResource, publicResource } from '../../../../lib/resources'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const resource = await getStoredResource(id)
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  return NextResponse.json({ resource: publicResource(resource) })
}
