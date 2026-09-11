import { NextResponse } from 'next/server'
import { getStoredResource } from '@/lib/resources'
import { appendIntegrityEvent, ensureDocumentCommitment, getIntegrityEvents, verifyIntegrity } from '@/lib/integrity'

export const runtime = 'nodejs'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const resource = await getStoredResource(id)
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  try {
    const commitment = await ensureDocumentCommitment({ resourceId: resource.id, caseId: resource.caseId, filename: resource.filename, sourceHash: resource.hash, storedPath: resource.storedPath })
    if (!commitment.document) return NextResponse.json({ valid: false, resourceId: resource.id, reason: 'The stored file no longer matches its original upload hash', currentHash: 'MISMATCH', committedHash: resource.hash }, { status: 409 })
    if (commitment.migrated) {
      await appendIntegrityEvent({ resourceId: resource.id, caseId: resource.caseId, eventType: 'LEGACY_RESOURCE_COMMITTED', inputHashes: [resource.hash], output: { resourceId: resource.id, source: 'pre-ledger resource migration' } })
    }
    const verification = await verifyIntegrity(resource.id, resource.storedPath)
    const events = await getIntegrityEvents(resource.id)
    return NextResponse.json({ ...verification, events })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Integrity verification failed' }, { status: 500 })
  }
}
