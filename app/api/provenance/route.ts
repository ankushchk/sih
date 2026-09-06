import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '../../../lib/neo4j'
import { buildProofRun, verifyProofRun, type ProofRun } from '../../../lib/provenance'

async function persistRun(run: ProofRun) {
  const session = getNeo4jDriver().session()
  try {
    await session.run('MERGE (run:ComputationRun {id: $runId}) SET run.caseId = $caseId, run.rootHash = $rootHash, run.status = $status, run.pipelineVersion = $pipelineVersion, run.scope = $scope', {
      runId: run.runId, caseId: run.caseId, rootHash: run.rootHash, status: run.status, pipelineVersion: run.pipelineVersion, scope: run.scope,
    })
    await session.run(`MATCH (run:ComputationRun {id: $runId})
      UNWIND $events AS item
      MERGE (event:ComputationEvent {id: item.eventId})
      SET event += item
      MERGE (run)-[:CONTAINS]->(event)`, { runId: run.runId, events: run.events })
    return true
  } finally {
    await session.close()
  }
}

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get('caseId') || 'CASE-1004'
  const run = buildProofRun(caseId)
  try {
    await persistRun(run)
    return NextResponse.json({ ...run, storage: 'neo4j', verification: verifyProofRun(run) })
  } catch {
    return NextResponse.json({ ...run, storage: 'deterministic-demo', verification: verifyProofRun(run) })
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { caseId?: string } | null
  const run = buildProofRun(body?.caseId || 'CASE-1004')
  const verification = verifyProofRun(run)
  return NextResponse.json({ ...verification, runId: run.runId, eventCount: run.events.length, status: verification.valid ? 'VERIFIED' : 'INVALID' })
}
