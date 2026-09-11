import { createHash } from 'node:crypto'
import { evidence, people, relationships, resources } from '@/src/data'

export type ProofEventType =
  | 'RESOURCE_COMMITTED'
  | 'EVIDENCE_CONTEXT_COMMITTED'
  | 'ENTITY_RESOLUTION_COMMITTED'
  | 'GRAPH_SNAPSHOT_COMMITTED'
  | 'LEAD_COMPUTED'
  | 'GRAPHRAG_PIPELINE_COMMITTED'

export type ProofEvent = {
  eventId: string
  sequence: number
  eventType: ProofEventType
  inputHashes: string[]
  outputHash: string
  previousOutputHash: string | null
  operationVersion: string
  previousEventHash: string | null
  eventHash: string
  createdAt: string
}

export type ProofRun = {
  runId: string
  caseId: string
  status: 'VERIFIED' | 'INVALID'
  rootHash: string
  pipelineVersion: string
  scope: string
  events: ProofEvent[]
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]))
  }
  return value
}

export function hashValue(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')
}

function scopedResources(caseId: string) {
  return resources.filter((resource) => resource.caseId === caseId || resource.caseId === 'MULTI-CASE')
}

export function buildProofRun(caseId = 'CASE-1004'): ProofRun {
  const scoped = scopedResources(caseId)
  const resourceHash = hashValue(scoped.map(({ id, filename, type, caseId: sourceCase, timestamp, hash }) => ({ id, filename, type, caseId: sourceCase, timestamp, sourceHash: hash })))
  const evidenceHash = hashValue(evidence.filter((item) => item.caseId === caseId).map(({ id, type, caseId: sourceCase, timestamp, excerpt, hash }) => ({ id, type, caseId: sourceCase, timestamp, excerpt, sourceHash: hash })))
  const entityHash = hashValue(people.map(({ id, name, alias, type, jurisdiction }) => ({ id, name, alias, type, jurisdiction })))
  const graphHash = hashValue(relationships.map(({ id, source, target, type, status, confidence, evidence, timestamp }) => ({ id, source, target, type, status, confidence, evidence, timestamp })))
  const leadHash = hashValue({ leadId: 'P003', label: 'Potential intermediary', score: 0.91, signals: ['cross-case', 'cross-city', 'cross-community'] })
  const graphRagPipelineHash = hashValue({ provider: 'OpenAI', model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini', retrieval: 'Neo4j graph + EvidenceChunk vector search', citationPolicy: 'retrieved-source-only' })
  const stages: { type: ProofEventType; inputs: string[]; output: string }[] = [
    { type: 'RESOURCE_COMMITTED', inputs: [], output: resourceHash },
    { type: 'EVIDENCE_CONTEXT_COMMITTED', inputs: [resourceHash], output: evidenceHash },
    { type: 'ENTITY_RESOLUTION_COMMITTED', inputs: [evidenceHash], output: entityHash },
    { type: 'GRAPH_SNAPSHOT_COMMITTED', inputs: [entityHash, evidenceHash], output: graphHash },
    { type: 'LEAD_COMPUTED', inputs: [graphHash], output: leadHash },
    { type: 'GRAPHRAG_PIPELINE_COMMITTED', inputs: [graphHash, evidenceHash, leadHash], output: graphRagPipelineHash },
  ]
  let previousEventHash: string | null = null
  let previousOutputHash: string | null = null
  const events = stages.map((stage, index) => {
    const eventId = `${caseId}-EVENT-${String(index + 1).padStart(2, '0')}`
    const createdAt = '2026-09-06T00:00:00.000Z'
    const inputHashes = previousOutputHash ? Array.from(new Set([previousOutputHash, ...stage.inputs])) : stage.inputs
    const eventData = { eventId, sequence: index + 1, eventType: stage.type, inputHashes, outputHash: stage.output, previousOutputHash, operationVersion: 'evidencegraph-provenance-v1', previousEventHash, createdAt }
    const eventHash = hashValue(eventData)
    previousEventHash = eventHash
    previousOutputHash = stage.output
    return { ...eventData, eventHash }
  })
  return { runId: `RUN-${caseId}-001`, caseId, status: 'VERIFIED', rootHash: previousEventHash || hashValue(caseId), pipelineVersion: 'evidencegraph-provenance-v1', scope: 'Canonical CASE-1004 demonstration inputs', events }
}

export function verifyProofRun(run: ProofRun) {
  let previousEventHash: string | null = null
  let previousOutputHash: string | null = null
  for (const event of run.events) {
    const expected = hashValue({ eventId: event.eventId, sequence: event.sequence, eventType: event.eventType, inputHashes: event.inputHashes, outputHash: event.outputHash, previousOutputHash: event.previousOutputHash, operationVersion: event.operationVersion, previousEventHash, createdAt: event.createdAt })
    const outputLinkValid = event.previousOutputHash === previousOutputHash && (previousOutputHash === null || event.inputHashes.includes(previousOutputHash))
    if (!outputLinkValid || event.previousEventHash !== previousEventHash || event.eventHash !== expected) return { valid: false, invalidEvent: event.eventId, rootHash: run.rootHash }
    previousEventHash = event.eventHash
    previousOutputHash = event.outputHash
  }
  return { valid: previousEventHash === run.rootHash, invalidEvent: null, rootHash: previousEventHash }
}
