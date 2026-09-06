import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { PDFParse } from 'pdf-parse'
import { people, secondaryEntities, type Entity } from '../src/data'

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
}

export type Extraction = {
  entityId: string
  canonicalName: string
  rawMention: string
  type: string
  confidence: number
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
  status: 'ready' | 'processed' | 'review' | 'approved'
  entities: number
  relationships: number
  addedBy: string
  storedPath: string
  text?: string
  extractions?: Extraction[]
  connections?: CandidateConnection[]
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

export async function listStoredResources() {
  return readResources()
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

function resolveEntities(text: string, resourceId: string): { extractions: Extraction[]; connections: CandidateConnection[] } {
  const lowered = text.toLowerCase()
  const extractions = canonicalEntities.flatMap((entity) => {
    const firstName = entity.type === 'PERSON' ? entity.name.split(' ')[0] : undefined
    const mention = [entity.name, entity.alias, firstName, entity.id]
      .filter((candidate) => candidate && candidate.length >= 4)
      .find((candidate) => lowered.includes(candidate!.toLowerCase()))
    return mention ? [{ entityId: entity.id, canonicalName: entity.name, rawMention: mention, type: entity.type, confidence: mention === entity.name ? 0.98 : 0.9 }] : []
  })
  const connections: CandidateConnection[] = []
  for (let index = 0; index < extractions.length; index += 1) {
    for (let next = index + 1; next < extractions.length; next += 1) {
      const left = extractions[index]
      const right = extractions[next]
      connections.push({ id: `${resourceId}-${left.entityId}-${right.entityId}`, source: left.entityId, target: right.entityId, sourceName: left.canonicalName, targetName: right.canonicalName, type: 'MENTIONED_TOGETHER', status: 'observed', confidence: Math.min(left.confidence, right.confidence), evidence: [resourceId] })
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
  const resource: StoredResource = { id, filename: file.name, type: resourceType(file.name), title: file.name, caseId, timestamp: new Date().toISOString(), excerpt: 'Uploaded resource awaiting processing.', hash, integrity: 'verified', size: `${Math.max(file.size / 1024, 1).toFixed(1)} KB`, status: 'ready', entities: 0, relationships: 0, addedBy, storedPath }
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

export function publicResource(resource: StoredResource) {
  const { storedPath: _storedPath, text: _text, ...publicData } = resource
  return publicData
}
