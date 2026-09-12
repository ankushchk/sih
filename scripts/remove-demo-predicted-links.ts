import neo4j from 'neo4j-driver'

const driver = neo4j.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'evidencegraph'))

async function removeDemoPredictedLinks() {
  const session = driver.session()
  try {
    const result = await session.run(`MATCH ()-[r]->() WHERE r.type = 'POTENTIAL_ASSOCIATION' DELETE r RETURN count(r) AS removed`)
    console.log(`Removed ${result.records[0].get('removed').toNumber()} demo predicted relationship(s)`)
  } finally {
    await session.close()
    await driver.close()
  }
}

void removeDemoPredictedLinks().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
