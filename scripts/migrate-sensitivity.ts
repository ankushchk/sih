import neo4j from 'neo4j-driver'

const driver = neo4j.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'evidencegraph'))

async function migrateSensitivity() {
  const session = driver.session()
  try {
    await session.run("MATCH (n:Entity) SET n.sensitivity = coalesce(n.sensitivity, 'STANDARD')")
    await session.run("MATCH ()-[r]->() SET r.sensitivity = coalesce(r.sensitivity, 'STANDARD')")
    console.log('Neo4j sensitivity defaults migrated')
  } finally {
    await session.close()
    await driver.close()
  }
}

void migrateSensitivity().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
