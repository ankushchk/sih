import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'
import { answerQuestion } from '@/lib/answerQuestion'
import { buildContext, findMentionedEntities, getSubgraphFacts, loadCanonicalEntities, searchEvidence, type EvidenceMatch } from '@/lib/graphRag'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { question?: string; caseId?: string } | null
  const question = body?.question?.trim()
  const caseId = body?.caseId?.trim() || 'CASE-1004'
  if (!question) return NextResponse.json({ error: 'A "question" field is required' }, { status: 400 })
  if (question.length > 1000) return NextResponse.json({ error: 'Question is too long' }, { status: 400 })

  const session = getNeo4jDriver().session()
  try {
    const entities = await loadCanonicalEntities(session)
    const mentioned = findMentionedEntities(question, entities)
    const facts = await getSubgraphFacts(session, mentioned.map((entity) => entity.id), caseId)
    let evidence: EvidenceMatch[] = []
    try {
      evidence = await searchEvidence(session, question, caseId)
    } catch (error) {
      console.warn('Evidence vector search unavailable:', error instanceof Error ? error.message : error)
    }
    const context = buildContext(facts, evidence, caseId)
    const result = await answerQuestion(question, context)
    const availableSources = new Set([...facts.flatMap((fact) => fact.sources), ...evidence.map((item) => item.sourceId)])
    const citedSources = result.citedSources.filter((source) => availableSources.has(source))
    return NextResponse.json({
      answer: result.answer,
      citedSources,
      mentionedEntities: mentioned.map((entity) => ({ id: entity.id, name: entity.name })),
      facts,
      evidence,
      factCount: facts.length,
      evidenceCount: evidence.length,
      caseId,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ask pipeline failed' }, { status: 500 })
  } finally {
    await session.close()
  }
}
