import { NextResponse } from 'next/server'
import { getIntegrityProof } from '@/lib/integrity'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const proof = await getIntegrityProof(id)
  if (!proof) return NextResponse.json({ error: 'No integrity commitment found' }, { status: 404 })
  return NextResponse.json(proof)
}
