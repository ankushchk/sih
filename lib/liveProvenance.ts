import { getIntegrityEvents, hashValue } from '@/lib/integrity'
import { listStoredResources, type StoredResource } from '@/lib/resources'
import { verifyProofRun, type ProofEvent, type ProofRun } from '@/lib/provenance'

function eventFrom(stage: { eventId: string; sequence: number; eventType: string; inputHashes: string[]; outputHash: string; previousOutputHash: string | null; previousEventHash: string | null; createdAt: string }): ProofEvent {
  const eventData = { ...stage, operationVersion: 'evidencegraph-live-provenance-v1' }
  return { ...eventData, eventHash: hashValue(eventData) } as ProofEvent
}

export async function buildLiveProofRun(caseId: string): Promise<ProofRun & { resourceCount: number }> {
  const resources = await listStoredResources(caseId)
  const ordered = resources.sort((left, right) => left.timestamp.localeCompare(right.timestamp))
  const events: ProofEvent[] = []
  let previousEventHash: string | null = null
  let previousOutputHash: string | null = null
  let sequence = 1

  for (const resource of ordered) {
    const resourceEvent = eventFrom({
      eventId: `${resource.id}-RESOURCE`, sequence, eventType: 'RESOURCE_COMMITTED',
      inputHashes: previousOutputHash ? [previousOutputHash] : [], outputHash: resource.hash,
      previousOutputHash, previousEventHash, createdAt: resource.timestamp,
    })
    events.push(resourceEvent)
    previousEventHash = resourceEvent.eventHash
    previousOutputHash = resourceEvent.outputHash
    sequence += 1
    const integrityEvents = await getIntegrityEvents(resource.id)
    for (const sourceEvent of integrityEvents) {
      const event = eventFrom({
        eventId: sourceEvent.eventId, sequence, eventType: sourceEvent.eventType,
        inputHashes: Array.from(new Set([previousOutputHash, ...sourceEvent.inputHashes].filter(Boolean) as string[])),
        outputHash: sourceEvent.outputHash, previousOutputHash, previousEventHash, createdAt: sourceEvent.createdAt,
      })
      events.push(event)
      previousEventHash = event.eventHash
      previousOutputHash = event.outputHash
      sequence += 1
    }
  }

  const run: ProofRun & { resourceCount: number } = {
    runId: `LIVE-RUN-${caseId}`,
    caseId,
    status: 'VERIFIED',
    rootHash: previousEventHash || hashValue({ caseId, resources: [] }),
    pipelineVersion: 'evidencegraph-live-provenance-v1',
    scope: `Persisted resources for ${caseId}`,
    events,
    resourceCount: resources.length,
  }
  run.status = verifyProofRun(run).valid ? 'VERIFIED' : 'INVALID'
  return run
}
