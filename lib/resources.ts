import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { PDFParse } from 'pdf-parse'
import { people, secondaryEntities, type Entity } from '@/src/data'
import { appendIntegrityEvent, commitDocument, getCurrentMerkleRoot, hashValue } from '@/lib/integrity'
import { anchorMerkleRoot } from '@/lib/integrityAnchor'

export type CandidateConnection = {
  id: string
  source: string
  target: string
  sourceName: string
  targetName: string
  type: string
  status: 'observed'
  confidence: number
  evidence: string[]
  evidenceExcerpt: string
  sourceSegment: string
  reviewStatus: 'pending' | 'approved' | 'rejected'
}

export type Extraction = {
  entityId: string
  canonicalName: string
  rawMention: string
  type: string
  confidence: number
  sourceExcerpt: string
  sourceIndex: number
}

export type StoredResource = {
  id: string
  filename: string
  type: string
  title: string
  caseId: string
  timestamp: string
  excerpt: string
  hash: string
  integrity: 'verified' | 'mismatch'
  size: string
  status: 'ready' | 'processing' | 'processed' | 'review' | 'approved' | 'failed'
  entities: number
  relationships: number
  addedBy: string
  storedPath: string
  text?: string
  extractions?: Extraction[]
  connections?: CandidateConnection[]
  integrityEntryHash?: string
  lastIntegrityEventHash?: string
  evidenceChunkCount?: number
  embeddingStatus?: 'pending' | 'indexed' | 'empty' | 'failed'
  processingStartedAt?: string
  processingCompletedAt?: string
  processingError?: string
  merkleRoot?: string | null
}

const dataDir = path.resolve(process.cwd(), '.data')
const resourceFile = path.join(dataDir, 'resources.json')
const uploadDir = path.join(dataDir, 'uploads')
const canonicalEntities: Entity[] = [...people, ...secondaryEntities]

async function ensureStorage() {
  await mkdir(uploadDir, { recursive: true })
}

async function readResources(): Promise<StoredResource[]> {
  try {
    return JSON.parse(await readFile(resourceFile, 'utf8')) as StoredResource[]
  } catch {
    return []
  }
}

async function writeResources(resources: StoredResource[]) {
  await ensureStorage()
  await writeFile(resourceFile, JSON.stringify(resources, null, 2), 'utf8')
}

export async function listStoredResources(caseId?: string) {
  const resources = await readResources()
  if (!caseId) return resources
  return resources.filter((resource) => resource.caseId === caseId || resource.caseId === 'MULTI-CASE')
}

export async function getStoredResource(id: string) {
  return (await readResources()).find((resource) => resource.id === id)
}

function resourceType(filename: string) {
  const extension = path.extname(filename).toLowerCase()
  if (extension === '.pdf') return 'FIR'
  if (extension === '.csv') return 'CSV'
  if (extension === '.json') return 'OSINT'
  return 'TRANSCRIPT'
}

async function extractText(buffer: Buffer, filename: string) {
  if (path.extname(filename).toLowerCase() === '.pdf') {
    const parser = new PDFParse({ data: buffer })
    const parsed = await parser.getText()
    await parser.destroy()
    return parsed.text || ''
  }
  return buffer.toString('utf8')
}

export function resolveEntities(text: string, resourceId: string): { extractions: Extraction[]; connections: CandidateConnection[] } {
  const lowered = text.toLowerCase()
  const extractions = canonicalEntities.flatMap((entity) => {
    const firstName = entity.type === 'PERSON' ? entity.name.split(' ')[0] : undefined
    const mention = [entity.name, entity.alias, firstName, entity.id]
      .filter((candidate) => candidate && candidate.length >= 4)
      .find((candidate) => lowered.includes(candidate!.toLowerCase()))
    if (!mention) return []
    const index = lowered.indexOf(mention.toLowerCase())
    return [{ entityId: entity.id, canonicalName: entity.name, rawMention: mention, type: entity.type, confidence: mention === entity.name ? 0.98 : 0.9, sourceExcerpt: text.slice(Math.max(0, index - 80), Math.min(text.length, index + mention.length + 160)).replace(/\s+/g, ' ').trim(), sourceIndex: index }]
  })
  const connections: CandidateConnection[] = []
  const segments = text.split(/\r?\n|(?<=\})\s*(?=\{)/).map((segment) => segment.trim()).filter(Boolean)
  const relationshipType = (segment: string) => {
    const value = segment.toLowerCase()
    if (/\b(call|called|phone|contact|communicat)/.test(value)) return 'CALLS'
    if (/\b(transf|paid|payment|account|inr|usd|amount)/.test(value)) return 'TRANSFERRED_TO'
    if (/\b(visit|visited|arriv|located|at\s+the|near\s+the)/.test(value)) return 'VISITED'
    if (/\b(meet|met|meeting|together|spoke|speaking)/.test(value)) return 'MET'
    return 'MENTIONED_TOGETHER'
  }
  for (const segment of segments) {
    const segmentEntities = extractions.filter((extraction) => segment.toLowerCase().includes(extraction.rawMention.toLowerCase()) || segment.toLowerCase().includes(extraction.entityId.toLowerCase()))
    for (let index = 0; index < segmentEntities.length; index += 1) {
      for (let next = index + 1; next < segmentEntities.length; next += 1) {
        const left = segmentEntities[index]
        const right = segmentEntities[next]
        connections.push({ id: `${resourceId}-${left.entityId}-${right.entityId}-${connections.length + 1}`, source: left.entityId, target: right.entityId, sourceName: left.canonicalName, targetName: right.canonicalName, type: relationshipType(segment), status: 'observed', confidence: Math.min(left.confidence, right.confidence), evidence: [resourceId], evidenceExcerpt: segment.slice(0, 500), sourceSegment: segment.slice(0, 500), reviewStatus: 'pending' })
      }
    }
  }
  return { extractions, connections }
}

export async function createResource(file: File, caseId: string, addedBy: string) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const hash = createHash('sha256').update(buffer).digest('hex')
  const id = `UPLOAD-${Date.now()}-${hash.slice(0, 8)}`
  const storedPath = path.join(uploadDir, `${id}-${path.basename(file.name)}`)
  await ensureStorage()
  await writeFile(storedPath, buffer)
  const commitment = await commitDocument({ resourceId: id, caseId, filename: file.name, sourceHash: hash })
  try {
    const root = await getCurrentMerkleRoot()
    if (root) await anchorMerkleRoot(caseId, root)
  } catch {
    // Local uploads remain available when Neo4j is offline; verification reports the unanchored state.
  }
  const resource: StoredResource = { id, filename: file.name, type: resourceType(file.name), title: file.name, caseId, timestamp: new Date().toISOString(), excerpt: 'Uploaded resource awaiting processing.', hash, integrity: 'verified', size: `${Math.max(file.size / 1024, 1).toFixed(1)} KB`, status: 'ready', entities: 0, relationships: 0, addedBy, storedPath, integrityEntryHash: commitment.entryHash }
  const resources = await readResources()
  resources.unshift(resource)
  await writeResources(resources)
  return resource
}

export async function processResource(id: string) {
  const resources = await readResources()
  const resource = resources.find((item) => item.id === id)
  if (!resource) return undefined
  const text = await extractText(await readFile(resource.storedPath), resource.filename)
  const { extractions, connections } = resolveEntities(text, resource.id)
  resource.text = text
  resource.extractions = extractions
  resource.connections = connections
  resource.excerpt = text.replace(/\s+/g, ' ').trim().slice(0, 280) || 'No text could be extracted from this resource.'
  resource.entities = extractions.length
  resource.relationships = connections.length
  resource.status = 'review'
  resource.processingCompletedAt = new Date().toISOString()
  resource.processingError = undefined
  resource.embeddingStatus = 'pending'
  await writeResources(resources)
  const processingEvent = await appendIntegrityEvent({ resourceId: resource.id, caseId: resource.caseId, eventType: 'EXTRACTION_COMMITTED', inputHashes: [resource.hash], output: { textHash: hashValue(text), extractions, connections } })
  resource.lastIntegrityEventHash = processingEvent.eventHash
  await writeResources(resources)
  return resource
}

export async function markResourceProcessing(id: string) {
  const resources = await readResources()
  const resource = resources.find((item) => item.id === id)
  if (!resource) return undefined
  resource.status = 'processing'
  resource.processingStartedAt = new Date().toISOString()
  resource.processingError = undefined
  await writeResources(resources)
  return resource
}

export async function markResourceProcessingFailed(id: string, error: string) {
  const resources = await readResources()
  const resource = resources.find((item) => item.id === id)
  if (!resource) return undefined
  resource.status = 'failed'
  resource.processingCompletedAt = new Date().toISOString()
  resource.processingError = error
  await writeResources(resources)
  return resource
}

export async function approveResource(id: string) {
  const resources = await readResources()
  const resource = resources.find((item) => item.id === id)
  if (!resource) return undefined
  resource.status = 'approved'
  await writeResources(resources)
  return resource
}

export async function updateConnectionReview(resourceId: string, connectionId: string, update: { action: 'approve' | 'reject' | 'update'; type?: string; confidence?: number }) {
  const resources = await readResources()
  const resource = resources.find((item) => item.id === resourceId)
  const connection = resource?.connections?.find((item) => item.id === connectionId)
  if (!resource || !connection) return undefined
  if (update.action === 'approve') connection.reviewStatus = 'approved'
  if (update.action === 'reject') connection.reviewStatus = 'rejected'
  if (update.action === 'update') {
    if (update.type) connection.type = update.type
    if (typeof update.confidence === 'number') connection.confidence = Math.max(0, Math.min(1, update.confidence))
  }
  const active = (resource.connections || []).filter((item) => item.reviewStatus !== 'rejected')
  if (active.length > 0 && active.every((item) => item.reviewStatus === 'approved')) resource.status = 'approved'
  await writeResources(resources)
  return { resource, connection }
}

export async function updateResourceEmbedding(id: string, result: { count: number; status: 'indexed' | 'empty' | 'failed' }) {
  const resources = await readResources()
  const resource = resources.find((item) => item.id === id)
  if (!resource) return undefined
  resource.evidenceChunkCount = result.count
  resource.embeddingStatus = result.status
  await writeResources(resources)
  return resource
}

export function publicResource(resource: StoredResource) {
  const { storedPath: _storedPath, text: _text, ...publicData } = resource
  return publicData
}
