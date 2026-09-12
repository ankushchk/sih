import { createRequire } from 'node:module'
import path from 'node:path'
import { createHash } from 'node:crypto'
import neo4j, { type Session } from 'neo4j-driver'
import { getNeo4jDriver } from '@/lib/neo4j'

const require = createRequire(import.meta.url)
const Database = require(path.resolve(process.cwd(), 'Epstein-doc-explorer/node_modules/better-sqlite3'))
const databasePath = path.resolve(process.cwd(), 'Epstein-doc-explorer/document_analysis.db')
const caseId = 'CASE-EPSTEIN'
const batchSize = 500

type Triple = { id: number; doc_id: string; timestamp: string | null; actor: string; action: string; target: string; location: string | null; triple_tags: string | null }
type DocumentRow = { doc_id: string; one_sentence_summary: string; paragraph_summary: string; category: string; date_range_earliest: string | null; date_range_latest: string | null; full_text: string | null }

function entityId(name: string) {
  return `EP-${createHash('sha1').update(name.trim().toLowerCase()).digest('hex').slice(0, 16)}`
}

async function runBatches(session: Session, rows: Record<string, unknown>[], query: string) {
  for (let index = 0; index < rows.length; index += batchSize) await session.run(query, { rows: rows.slice(index, index + batchSize) })
}

async function importCorpus() {
  const db = new Database(databasePath, { readonly: true })
  const session = getNeo4jDriver().session()
  try {
    await session.run(`MERGE (c:Case {id: $caseId})
      SET c.title = 'Epstein document corpus', c.status = 'REVIEW', c.priority = 'HIGH',
        c.jurisdiction = 'Corpus scope', c.assignedInvestigator = 'demo-investigator',
        c.dataset = 'Epstein-doc-explorer', c.synthetic = false`, { caseId })

    const documents = db.prepare(`SELECT doc_id, one_sentence_summary, paragraph_summary, category, date_range_earliest, date_range_latest, full_text FROM documents WHERE error IS NULL`).all() as DocumentRow[]
    const documentRows = documents.map((document) => ({ id: `EP-DOC-${document.doc_id}`, docId: document.doc_id, text: (document.full_text || document.paragraph_summary || document.one_sentence_summary || '').slice(0, 20000), sourceId: document.doc_id, sourceType: document.category, caseId, title: document.one_sentence_summary, dateStart: document.date_range_earliest, dateEnd: document.date_range_latest }))
    await runBatches(session, documentRows, `UNWIND $rows AS row
      MERGE (doc:EvidenceChunk {id: row.id})
      SET doc.text = row.text, doc.sourceId = row.sourceId, doc.sourceType = row.sourceType,
        doc.caseId = row.caseId, doc.title = row.title, doc.dateStart = row.dateStart, doc.dateEnd = row.dateEnd,
        doc.resourceId = row.id`)

    const triples = db.prepare(`SELECT id, doc_id, timestamp, actor, action, target, location, triple_tags FROM rdf_triples WHERE actor != '' AND target != ''`).all() as Triple[]
    const entityRows = Array.from(new Map(triples.flatMap((triple) => [triple.actor, triple.target]).map((name) => [entityId(name), { id: entityId(name), name, type: 'PERSON', caseId, sensitivity: 'STANDARD' }])).values())
    await runBatches(session, entityRows, `UNWIND $rows AS row
      MERGE (entity:Entity {id: row.id})
      SET entity.name = row.name, entity.type = row.type, entity.caseId = row.caseId,
        entity.sensitivity = row.sensitivity, entity.dataset = 'Epstein-doc-explorer'`)
    const relationshipRows = triples.map((triple) => ({ id: `EP-TRIPLE-${triple.id}`, source: entityId(triple.actor), target: entityId(triple.target), action: triple.action, timestamp: triple.timestamp, location: triple.location, tags: triple.triple_tags ? JSON.parse(triple.triple_tags) : [], sourceId: triple.doc_id, caseId }))
    await runBatches(session, relationshipRows, `UNWIND $rows AS row
      MATCH (a:Entity {id: row.source}), (b:Entity {id: row.target})
      MERGE (a)-[r:EVIDENCE_RELATES {id: row.id}]->(b)
      SET r.type = row.action, r.action = row.action, r.timestamp = row.timestamp, r.location = row.location,
        r.sources = [row.sourceId], r.caseId = row.caseId, r.caseIds = [row.caseId], r.tags = row.tags,
        r.status = 'observed', r.sensitivity = 'STANDARD', r.dataset = 'Epstein-doc-explorer'`)
    await session.run(`CREATE FULLTEXT INDEX evidenceText IF NOT EXISTS FOR (e:EvidenceChunk) ON EACH [e.text]`)
    console.log(`Imported ${documents.length} documents, ${triples.length} triples, and ${entityRows.length} entities into ${caseId}`)
  } finally {
    db.close()
    await session.close()
  }
}

void importCorpus().catch((error) => { console.error(error); process.exitCode = 1 })
