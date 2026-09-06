import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import neo4j from 'neo4j-driver'
import { PDFParse } from 'pdf-parse'
import { getEmbeddingProvider } from '../lib/embeddings'

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
const user = process.env.NEO4J_USER || 'neo4j'
const password = process.env.NEO4J_PASSWORD || 'evidencegraph'
const dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 1536)
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
const DATASET_ROOT = path.resolve(process.cwd(), 'EvidenceGraph_Synthetic_Dataset')

type Chunk = { id: string; text: string; sourceId: string; sourceType: string; caseId?: string }

function caseForSource(sourceId: string) {
  const match = sourceId.match(/(?:FIR|SURV|PR|CT)-?(\d{4})/i)
  if (!match) return undefined
  if (match[1].startsWith('1')) return `CASE-${match[1]}`
  if (sourceId.startsWith('PR-2004') || sourceId.startsWith('CT-300')) return 'CASE-1004'
  return undefined
}

function chunkText(text: string, maxLength = 800): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  const chunks: string[] = []
  let buffer = ''
  for (const paragraph of paragraphs) {
    if ((buffer + '\n' + paragraph).length > maxLength && buffer) {
      chunks.push(buffer.trim())
      buffer = paragraph
    } else {
      buffer = buffer ? `${buffer}\n${paragraph}` : paragraph
    }
  }
  if (buffer) chunks.push(buffer.trim())
  return chunks.length ? chunks : [text.trim()]
}

async function collectPdfChunks(folder: string, sourceType: string): Promise<Chunk[]> {
  const dir = path.join(DATASET_ROOT, folder)
  let files: string[] = []
  try { files = await readdir(dir) } catch { return [] }
  const chunks: Chunk[] = []
  for (const file of files.filter((name) => name.endsWith('.pdf'))) {
    const sourceId = path.basename(file, '.pdf')
    const parser = new PDFParse({ data: await readFile(path.join(dir, file)) })
    const parsed = await parser.getText()
    await parser.destroy()
    chunkText(parsed.text as string).forEach((text, index) => chunks.push({ id: `${sourceId}-${index}`, text, sourceId, sourceType, caseId: caseForSource(sourceId) }))
  }
  return chunks
}

async function collectTextChunks(folder: string, file: string, sourceType: string): Promise<Chunk[]> {
  try {
    const raw = await readFile(path.join(DATASET_ROOT, folder, file), 'utf8')
    const sourceId = path.basename(file, path.extname(file))
    return chunkText(raw).map((text, index) => ({ id: `${sourceId}-${index}`, text, sourceId, sourceType, caseId: caseForSource(sourceId) }))
  } catch { return [] }
}

async function collectCsvChunks(folder: string, file: string, sourceType: string): Promise<Chunk[]> {
  try {
    const raw = await readFile(path.join(DATASET_ROOT, folder, file), 'utf8')
    const sourceId = path.basename(file, path.extname(file))
    return chunkText(raw, 1200).map((text, index) => ({ id: `${sourceId}-${index}`, text, sourceId, sourceType }))
  } catch { return [] }
}

async function main() {
  const chunks: Chunk[] = [
    ...(await collectPdfChunks('01_firs', 'FIR')),
    ...(await collectPdfChunks('02_police_reports', 'POLICE_REPORT')),
    ...(await collectPdfChunks('07_court', 'COURT')),
    ...(await collectTextChunks('08_audio_transcripts', 'hearing_transcripts.txt', 'AUDIO_TRANSCRIPT')),
    ...(await collectTextChunks('09_osint', 'social_posts.json', 'OSINT')),
    ...(await collectCsvChunks('03_cdr', 'cdr_records.csv', 'CDR')),
    ...(await collectCsvChunks('04_financial', 'transactions.csv', 'FINANCIAL')),
    ...(await collectCsvChunks('05_surveillance', 'surveillance_events.csv', 'SURVEILLANCE')),
    ...(await collectCsvChunks('06_vehicle', 'vehicle_registry.csv', 'VEHICLE')),
  ]
  if (!chunks.length) throw new Error('No evidence text found under EvidenceGraph_Synthetic_Dataset/')

  const provider = getEmbeddingProvider()
  const session = driver.session()
  try {
    await session.run(`CREATE VECTOR INDEX evidenceEmbeddings IF NOT EXISTS FOR (e:EvidenceChunk) ON (e.embedding) OPTIONS {indexConfig: {\`vector.dimensions\`: $dimensions, \`vector.similarity_function\`: 'cosine'}}`, { dimensions: neo4j.int(dimensions) })
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20)
      const embeddings = await provider.embed(batch.map((chunk) => chunk.text))
      await session.run(`UNWIND $rows AS row MERGE (e:EvidenceChunk {id: row.id}) SET e.text = row.text, e.sourceId = row.sourceId, e.sourceType = row.sourceType, e.caseId = row.caseId, e.embedding = row.embedding`, { rows: batch.map((chunk, index) => ({ ...chunk, embedding: embeddings[index] })) })
      console.log(`embedded ${Math.min(i + batch.length, chunks.length)}/${chunks.length}`)
    }
  } finally {
    await session.close()
    await driver.close()
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
