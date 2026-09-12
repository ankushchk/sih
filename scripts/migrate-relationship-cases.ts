import neo4j from 'neo4j-driver'

const driver = neo4j.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'evidencegraph'))
const caseEntities: Record<string, Set<string>> = {
  'CASE-1001': new Set(['P001', 'P003', 'L001', 'V001']),
  'CASE-1002': new Set(['P002', 'P003', 'P005', 'L005', 'A002', 'A003']),
  'CASE-1003': new Set(['P003', 'P004', 'L004', 'A003', 'A004', 'A005']),
  'CASE-1004': new Set(['P001', 'P003', 'P004', 'L003', 'V004']),
}

async function migrate() {
  const session = driver.session()
  try {
    await session.run(`MATCH (c:Case) SET c.assignedInvestigator = coalesce(c.assignedInvestigator, 'demo-investigator')`)
    const result = await session.run(`MATCH (a)-[r]->(b) RETURN id(r) AS internalId, coalesce(r.caseId, '') AS caseId, coalesce(r.caseIds, []) AS caseIds, a.id AS source, b.id AS target`)
    let updated = 0
    for (const record of result.records) {
      const existing = new Set<string>([record.get('caseId') as string, ...(record.get('caseIds') as string[])].filter(Boolean))
      for (const [caseId, entities] of Object.entries(caseEntities)) if (entities.has(record.get('source') as string) && entities.has(record.get('target') as string)) existing.add(caseId)
      const caseIds = Array.from(existing)
      if (!caseIds.length) continue
      await session.run('MATCH ()-[r]->() WHERE id(r) = $internalId SET r.caseIds = $caseIds, r.caseId = $caseId', { internalId: record.get('internalId'), caseIds, caseId: caseIds[0] })
      updated += 1
    }
    console.log(`Backfilled case scope on ${updated} relationships`)
  } finally {
    await session.close()
    await driver.close()
  }
}

void migrate().catch((error) => { console.error(error); process.exitCode = 1 })
