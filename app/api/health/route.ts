import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'

export async function GET() {
  const openai = process.env.OPENAI_API_KEY ? 'configured' : 'missing'
  try {
    await getNeo4jDriver().verifyConnectivity()
    return NextResponse.json({ ok: true, graph: 'neo4j', openai })
  } catch {
    return NextResponse.json({ ok: false, graph: 'unavailable', openai }, { status: 503 })
  }
}
