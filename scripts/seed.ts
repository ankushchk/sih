import neo4j from 'neo4j-driver'

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
const user = process.env.NEO4J_USER || 'neo4j'
const password = process.env.NEO4J_PASSWORD || 'evidencegraph'
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

const people = [
  ['P001', 'Rahul Sharma', 'Raju', 'Delhi'], ['P002', 'Sameer Khan', 'Sam', 'Noida'],
  ['P003', 'Vikram Malhotra', 'Vicky', 'Delhi'], ['P004', 'Rakesh Yadav', 'Rocky', 'Ghaziabad'],
  ['P005', 'Imran Ali', 'Immi', 'Noida'], ['P006', 'Neha Verma', 'Neha', 'Delhi'],
  ['P007', 'Arjun Mehta', 'A.M.', 'Gurugram'], ['P008', 'Kavya Singh', 'Kavya', 'Noida'],
  ['P009', 'Deepak Rao', 'Deep', 'Ghaziabad'], ['P010', 'Mohit Sethi', 'M.S.', 'Delhi'],
  ['P011', 'Sana Qureshi', 'Sana', 'Noida'], ['P012', 'Ajay Batra', 'Ajay', 'Delhi'],
]
const phones = Array.from({ length: 12 }, (_, i) => [`PH${String(i + 1).padStart(3, '0')}`, `90000000${String(i + 1).padStart(2, '0')}`, `P${String(i + 1).padStart(3, '0')}`])
const accounts = [['A001', 'Northline Trading', 'P001'], ['A002', 'Sunrise Exports', 'P002'], ['A003', 'V-Metro Services', 'P003'], ['A004', 'R.Y. Enterprises', 'P004'], ['A005', 'Blue Arc Traders', 'P005'], ['A006', 'Kavya Consulting', 'P008'], ['A007', 'M.S. Wholesale', 'P010']]
const vehicles = [['V001', 'White SUV', 'DL01AB1234', 'P001'], ['V002', 'Black Sedan', 'UP16CD7788', 'P002'], ['V003', 'Grey Hatchback', 'DL8CAF4455', 'P003'], ['V004', 'White Van', 'UP14EF9090', 'P004'], ['V005', 'Blue Sedan', 'DL5GH2201', 'P005']]
const locations = [['L001', 'Warehouse 7', 'Noida'], ['L002', 'Sector 18 Metro Parking', 'Noida'], ['L003', 'Cafe Meridian', 'Delhi'], ['L004', 'Old Industrial Road', 'Ghaziabad'], ['L005', 'Blue Arc Office', 'Noida'], ['L006', 'Central Bus Terminal', 'Delhi']]
const organizations = [['O001', 'Northline Logistics'], ['O002', 'Blue Arc Traders'], ['O003', 'Metroline Couriers']]
const cases = [['CASE-1001', 'Warehouse 7 meeting correlation'], ['CASE-1002', 'Blue Arc Office association review'], ['CASE-1003', 'Old Industrial Road financial trail'], ['CASE-1004', 'Cafe Meridian Network Demonstration'], ['CASE-1005', 'Sector 18 convergence review']]

const observed = [
  ['P001', 'P002', 'MET', 'FIR-1001;SURV-0001', 'CASE-1001'], ['P001', 'P003', 'ASSOCIATED_WITH', 'FIR-1001;CDR;SURV-0003', 'CASE-1001'],
  ['P002', 'P003', 'ASSOCIATED_WITH', 'FIR-1002;CDR;SURV-0006', 'CASE-1002'], ['P003', 'P004', 'ASSOCIATED_WITH', 'FIR-1003;CDR;SURV-0009', 'CASE-1003'],
  ['P001', 'P004', 'ASSOCIATED_WITH', 'FIR-1004;SURV-0012;AUDIO-001', 'CASE-1004'], ['P003', 'P005', 'ASSOCIATED_WITH', 'FIR-1002;CDR;SURV-0006;TXN-0002', 'CASE-1002'],
  ['P004', 'P005', 'FINANCIAL_ASSOCIATION', 'TXN-0004', 'CASE-1003'], ['P001', 'P005', 'POTENTIAL_ASSOCIATION', 'GRAPH-001;TEMPORAL-001', 'CASE-1004'],
  ['P006', 'P001', 'CALLS', 'CDR-0096;CDR-0098', 'CASE-1005'], ['P007', 'P003', 'CALLS', 'CDR-0092;CDR-0093', 'CASE-1002'],
  ['P008', 'P003', 'CALLS', 'CDR-0103;CDR-0113', 'CASE-1002'], ['P009', 'P003', 'CALLS', 'CDR-0080;CDR-0084', 'CASE-1004'],
  ['P010', 'P005', 'CALLS', 'CDR-0085;CDR-0087', 'CASE-1003'], ['P011', 'P005', 'CALLS', 'CDR-0099;CDR-0100', 'CASE-1002'],
  ['P012', 'P003', 'CALLS', 'CDR-0126;CDR-0142', 'CASE-1004'], ['P002', 'P011', 'CALLS', 'CDR-0114', 'CASE-1004'],
]

export async function seed() {
  const session = driver.session()
  try {
    await session.run('CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE')
    await session.run('CREATE CONSTRAINT case_id IF NOT EXISTS FOR (n:Case) REQUIRE n.id IS UNIQUE')
    await session.run('MATCH (n) DETACH DELETE n')
    await session.run('UNWIND $rows AS row MERGE (n:Entity {id: row[0]}) SET n.type = "PERSON", n.name = row[1], n.alias = row[2], n.jurisdiction = row[3]', { rows: people })
    await session.run('UNWIND $rows AS row MERGE (n:Entity {id: row[0]}) SET n.type = "PHONE", n.name = row[1] WITH n, row MATCH (p:Entity {id: row[2]}) MERGE (p)-[:USES {source: "canonical_entities.csv", status: "observed"}]->(n)', { rows: phones })
    await session.run('UNWIND $rows AS row MERGE (n:Entity {id: row[0]}) SET n.type = "BANK_ACCOUNT", n.name = row[1] WITH n, row MATCH (p:Entity {id: row[2]}) MERGE (p)-[:CONTROLS {source: "canonical_entities.csv", status: "observed"}]->(n)', { rows: accounts })
    await session.run('UNWIND $rows AS row MERGE (n:Entity {id: row[0]}) SET n.type = "VEHICLE", n.name = row[1] + " · " + row[2] WITH n, row MATCH (p:Entity {id: row[3]}) MERGE (p)-[:OWNS {source: "vehicle_registry.csv", status: "observed"}]->(n)', { rows: vehicles })
    await session.run('UNWIND $rows AS row MERGE (n:Entity {id: row[0]}) SET n.type = "LOCATION", n.name = row[1], n.jurisdiction = row[2]', { rows: locations })
    await session.run('UNWIND $rows AS row MERGE (n:Entity {id: row[0]}) SET n.type = "ORGANIZATION", n.name = row[1]', { rows: organizations })
    await session.run('UNWIND $rows AS row MERGE (n:Case {id: row[0]}) SET n.title = row[1]', { rows: cases })
    await session.run('UNWIND $rows AS row MATCH (a:Entity {id: row[0]}), (b:Entity {id: row[1]}) MERGE (a)-[r:RELATES {id: row[0] + "-" + row[1], type: row[2]}]->(b) SET r.status = CASE WHEN row[2] = "POTENTIAL_ASSOCIATION" THEN "predicted" WHEN row[2] IN ["MET", "FINANCIAL_ASSOCIATION", "CALLS"] THEN "observed" ELSE "corroborated" END, r.sources = split(row[3], ";"), r.caseId = row[4]', { rows: observed })
    await session.run('MATCH (p:Entity {type: "PERSON"}), (c:Case) WHERE c.id IN ["CASE-1001", "CASE-1002", "CASE-1003", "CASE-1004", "CASE-1005"] AND (p.id IN ["P001", "P002", "P003", "P004", "P005"]) MERGE (p)-[:MENTIONED_IN {status: "observed", source: "case index"}]->(c)')
    await session.run('MATCH (p:Entity {id: "P001"}), (l:Entity {id: "L001"}), (c:Case {id: "CASE-1001"}) MERGE (p)-[:VISITED {status: "observed", source: "SURV-0001", timestamp: "2026-08-12 20:15"}]->(l) MERGE (p)-[:APPEARED_IN {status: "observed", source: "SURV-0001"}]->(c)')
    await session.run('MATCH (p:Entity {id: "P003"}), (l:Entity {id: "L003"}), (c:Case {id: "CASE-1004"}) MERGE (p)-[:VISITED {status: "observed", source: "SURV-0010", timestamp: "2026-08-20 17:32"}]->(l) MERGE (p)-[:APPEARED_IN {status: "observed", source: "SURV-0010"}]->(c)')
    console.log('EvidenceGraph Neo4j seed complete')
  } finally { await session.close(); await driver.close() }
}

if (process.argv[1]?.endsWith('seed.ts')) seed().catch((error: { code?: string }) => {
  if (error.code === 'ServiceUnavailable') {
    console.error('Neo4j is not reachable at ' + uri + '. Start Neo4j, then run npm run seed:neo4j again.')
    console.error('Docker users: docker compose up -d neo4j')
  } else console.error(error)
  process.exit(1)
})
