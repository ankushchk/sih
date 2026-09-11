import { getNeo4jDriver } from '@/lib/neo4j'

export async function anchorMerkleRoot(caseId: string, rootHash: string) {
  const session = getNeo4jDriver().session()
  try {
    await session.run(`MERGE (anchor:IntegrityAnchor {id: $id})
      SET anchor.caseId = $caseId, anchor.currentRoot = $rootHash, anchor.updatedAt = datetime()
      MERGE (commit:MerkleCommit {id: $commitId})
      SET commit.caseId = $caseId, commit.rootHash = $rootHash, commit.createdAt = datetime()
      MERGE (anchor)-[:COMMITTED_ROOT]->(commit)`, { id: `MERKLE-${caseId}`, commitId: `MERKLE-${caseId}-${rootHash}`, caseId, rootHash })
    return { anchored: true, rootHash }
  } finally {
    await session.close()
  }
}

export async function verifyMerkleAnchor(caseId: string, rootHash: string | null) {
  if (!rootHash) return { anchored: false, valid: false, rootHash: null }
  const session = getNeo4jDriver().session()
  try {
    const result = await session.run('MATCH (anchor:IntegrityAnchor {id: $id}) RETURN anchor.currentRoot AS rootHash', { id: `MERKLE-${caseId}` })
    const anchoredRoot = result.records[0]?.get('rootHash') as string | undefined
    return { anchored: Boolean(anchoredRoot), valid: anchoredRoot === rootHash, rootHash: anchoredRoot || null }
  } finally {
    await session.close()
  }
}
