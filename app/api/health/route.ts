import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '../../../lib/neo4j'

export async function GET() {
  try {
    await getNeo4jDriver().verifyConnectivity()
    return NextResponse.json({ ok: true, graph: 'neo4j' })
  } catch {
    return NextResponse.json({ ok: false, graph: 'unavailable' }, { status: 503 })
  }
}
