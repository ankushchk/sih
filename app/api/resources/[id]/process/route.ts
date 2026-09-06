import { NextResponse } from 'next/server'
import { processResource, publicResource } from '../../../../../lib/resources'

export const runtime = 'nodejs'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const resource = await processResource(id)
    if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    return NextResponse.json({ resource: publicResource(resource), extractions: resource.extractions || [], connections: resource.connections || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Resource processing failed' }, { status: 422 })
  }
}
