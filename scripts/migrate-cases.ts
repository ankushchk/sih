import neo4j from 'neo4j-driver'
import { cases } from '@/src/data'

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
const user = process.env.NEO4J_USER || 'neo4j'
const password = process.env.NEO4J_PASSWORD || 'evidencegraph'
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

async function migrateCases() {
  const session = driver.session()
  try {
    await session.run(`UNWIND $rows AS row
      MERGE (c:Case {id: row.id})
      SET c.title = row.title, c.status = row.status, c.priority = row.priority, c.jurisdiction = row.jurisdiction`, {
      rows: cases.map((item) => ({ id: item.id, title: item.title, status: item.status, priority: item.priority, jurisdiction: item.jurisdiction })),
    })
    console.log('Neo4j case metadata migrated')
  } finally {
    await session.close()
    await driver.close()
  }
}

void migrateCases().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
