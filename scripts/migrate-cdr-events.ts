import { readFile } from 'node:fs/promises'
import path from 'node:path'
import neo4j from 'neo4j-driver'

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
const user = process.env.NEO4J_USER || 'neo4j'
const password = process.env.NEO4J_PASSWORD || 'evidencegraph'
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

async function migrateCdrEvents() {
  const csv = await readFile(path.resolve(process.cwd(), 'EvidenceGraph_Synthetic_Dataset/03_cdr/cdr_records.csv'), 'utf8')
  const [, ...lines] = csv.trim().split(/\r?\n/)
  const headers = ['id', 'callerPhone', 'receiverPhone', 'timestamp', 'durationSec', 'cellTower', 'caseId']
  const rows = lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value])))
  const session = driver.session()
  try {
    await session.run(`UNWIND $rows AS row
      MERGE (event:CallEvent {id: row.id})
      SET event.callerPhone = row.callerPhone, event.receiverPhone = row.receiverPhone,
        event.timestamp = datetime(replace(row.timestamp, ' ', 'T')), event.durationSec = toInteger(row.durationSec),
        event.cellTower = row.cellTower, event.caseId = row.caseId, event.source = 'cdr_records.csv'
      WITH event, row
      MATCH (caller:Entity {id: row.callerPhone}), (receiver:Entity {id: row.receiverPhone})
      MERGE (caller)-[:CALL_EVENT]->(event)
      MERGE (event)-[:CALL_EVENT]->(receiver)`, { rows })
    console.log(`Migrated ${rows.length} timestamped CDR events`)
  } finally {
    await session.close()
    await driver.close()
  }
}

void migrateCdrEvents().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
