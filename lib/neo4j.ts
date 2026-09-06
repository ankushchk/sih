import neo4j, { type Driver } from 'neo4j-driver'

let driver: Driver | undefined

export function getNeo4jDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
    const user = process.env.NEO4J_USER || 'neo4j'
    const password = process.env.NEO4J_PASSWORD || 'evidencegraph'
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
  }
  return driver
}
