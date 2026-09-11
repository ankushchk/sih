import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type IntegrityDocument = {
  resourceId: string
  caseId: string
  filename: string
  sourceHash: string
  sequence: number
  previousEntryHash: string | null
  entryHash: string
  committedAt: string
  storedPath?: string
}

export type IntegrityEvent = {
  eventId: string
  resourceId: string
  caseId: string
  eventType: string
  sequence: number
  inputHashes: string[]
  outputHash: string
  previousEventHash: string | null
  eventHash: string
  operationVersion: string
  createdAt: string
}

type IntegrityStore = {
  documents: IntegrityDocument[]
  events: IntegrityEvent[]
  merkleRoot: string | null
}

const dataDir = path.resolve(process.cwd(), '.data')
const storePath = path.join(dataDir, 'integrity.json')

export function hashValue(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')
}

export function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]))
  }
  return value
}

async function readStore(): Promise<IntegrityStore> {
  try {
    return JSON.parse(await readFile(storePath, 'utf8')) as IntegrityStore
  } catch {
    return { documents: [], events: [], merkleRoot: null }
  }
}

async function writeStore(store: IntegrityStore) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8')
}

function merkleLevel(hashes: string[]) {
  const level = hashes.length % 2 === 1 ? [...hashes, hashes[hashes.length - 1]] : hashes
  const next: string[] = []
  for (let index = 0; index < level.length; index += 2) next.push(hashValue({ left: level[index], right: level[index + 1] }))
  return next
}

export function calculateMerkleRoot(leaves: string[]) {
  if (leaves.length === 0) return null
  let level = [...leaves]
  while (level.length > 1) level = merkleLevel(level)
  return level[0]
}

export function calculateMerkleProof(leaves: string[], leafIndex: number) {
  if (leafIndex < 0 || leafIndex >= leaves.length) return []
  const proof: { hash: string; side: 'left' | 'right' }[] = []
  let level = [...leaves]
  let index = leafIndex
  while (level.length > 1) {
    const padded = level.length % 2 === 1 ? [...level, level[level.length - 1]] : level
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1
    proof.push({ hash: padded[siblingIndex], side: index % 2 === 0 ? 'right' : 'left' })
    level = merkleLevel(level)
    index = Math.floor(index / 2)
  }
  return proof
}

function documentLeaves(documents: IntegrityDocument[]) {
  return [...documents].sort((a, b) => a.sequence - b.sequence).map((document) => document.entryHash)
}

export async function commitDocument(input: { resourceId: string; caseId: string; filename: string; sourceHash: string }) {
  const store = await readStore()
  const existing = store.documents.find((document) => document.resourceId === input.resourceId)
  if (existing) return existing
  const previous = [...store.documents].sort((a, b) => a.sequence - b.sequence).at(-1)
  const committedAt = new Date().toISOString()
  const sequence = store.documents.length + 1
  const documentData = { resourceId: input.resourceId, caseId: input.caseId, filename: input.filename, sourceHash: input.sourceHash, sequence, previousEntryHash: previous?.entryHash || null, committedAt }
  const document = { ...documentData, entryHash: hashValue(documentData) }
  store.documents.push(document)
  store.merkleRoot = calculateMerkleRoot(documentLeaves(store.documents))
  await writeStore(store)
  return document
}

export async function ensureDocumentCommitment(input: { resourceId: string; caseId: string; filename: string; sourceHash: string; storedPath: string }) {
  const store = await readStore()
  const existing = store.documents.find((document) => document.resourceId === input.resourceId)
  if (existing) return { document: existing, migrated: false }
  const currentHash = hashBuffer(await readFile(input.storedPath))
  if (currentHash !== input.sourceHash) return { document: undefined, migrated: false }
  const document = await commitDocument(input)
  return { document, migrated: true }
}

export async function appendIntegrityEvent(input: { resourceId: string; caseId: string; eventType: string; inputHashes: string[]; output: unknown }) {
  const store = await readStore()
  const document = store.documents.find((item) => item.resourceId === input.resourceId)
  if (!document) throw new Error(`No integrity commitment exists for ${input.resourceId}`)
  const resourceEvents = store.events.filter((event) => event.resourceId === input.resourceId).sort((a, b) => a.sequence - b.sequence)
  const previous = resourceEvents.at(-1)
  const sequence = resourceEvents.length + 1
  const outputHash = hashValue(input.output)
  const eventId = `${input.resourceId}-EVENT-${String(sequence).padStart(2, '0')}`
  const createdAt = new Date().toISOString()
  const inputHashes = Array.from(new Set([previous?.outputHash || document.entryHash, ...input.inputHashes]))
  const eventData = { eventId, resourceId: input.resourceId, caseId: input.caseId, eventType: input.eventType, sequence, inputHashes, outputHash, previousEventHash: previous?.eventHash || null, operationVersion: 'evidencegraph-integrity-v2', createdAt }
  const event = { ...eventData, eventHash: hashValue(eventData) }
  store.events.push(event)
  await writeStore(store)
  return event
}

export async function verifyIntegrity(resourceId: string, storedPath: string) {
  const store = await readStore()
  const document = store.documents.find((item) => item.resourceId === resourceId)
  if (!document) return { valid: false, reason: 'No committed document found', resourceId }
  const currentHash = hashBuffer(await readFile(storedPath))
  const documents = [...store.documents].sort((a, b) => a.sequence - b.sequence)
  let previousEntryHash: string | null = null
  const invalidDocument = documents.find((item) => {
    const expected = hashValue({ resourceId: item.resourceId, caseId: item.caseId, filename: item.filename, sourceHash: item.sourceHash, sequence: item.sequence, previousEntryHash, committedAt: item.committedAt, storedPath: item.storedPath })
    const invalid = item.previousEntryHash !== previousEntryHash || item.entryHash !== expected
    previousEntryHash = item.entryHash
    return invalid
  })
  const merkleRoot = calculateMerkleRoot(documentLeaves(documents))
  const events = store.events.filter((event) => event.resourceId === resourceId).sort((a, b) => a.sequence - b.sequence)
  let previousEventHash: string | null = null
  let previousOutputHash: string | null = null
  const invalidEvent = events.find((event) => {
    const expected = hashValue({ eventId: event.eventId, resourceId: event.resourceId, caseId: event.caseId, eventType: event.eventType, sequence: event.sequence, inputHashes: event.inputHashes, outputHash: event.outputHash, previousEventHash, operationVersion: event.operationVersion, createdAt: event.createdAt })
    const valid = event.previousEventHash === previousEventHash && event.inputHashes.includes(previousOutputHash || document.entryHash) && event.eventHash === expected
    previousEventHash = event.eventHash
    previousOutputHash = event.outputHash
    return !valid
  })
  return {
    valid: currentHash === document.sourceHash && !invalidDocument && store.merkleRoot === merkleRoot && !invalidEvent,
    resourceId,
    committedHash: document.sourceHash,
    currentHash,
    merkleRoot,
    invalidDocument: invalidDocument?.resourceId || null,
    invalidEvent: invalidEvent?.eventId || null,
    eventCount: events.length,
  }
}

export async function getIntegrityProof(resourceId: string) {
  const store = await readStore()
  const documents = [...store.documents].sort((a, b) => a.sequence - b.sequence)
  const index = documents.findIndex((document) => document.resourceId === resourceId)
  if (index < 0) return undefined
  const document = documents[index]
  return { resourceId, leaf: document.entryHash, merkleRoot: store.merkleRoot, proof: calculateMerkleProof(documentLeaves(documents), index) }
}

export async function getIntegrityEvents(resourceId: string) {
  const store = await readStore()
  return store.events.filter((event) => event.resourceId === resourceId).sort((a, b) => a.sequence - b.sequence)
}

export async function getCurrentMerkleRoot() {
  const store = await readStore()
  return store.merkleRoot
}
