import { NextResponse } from 'next/server'
import { getNeo4jDriver } from '@/lib/neo4j'

export const runtime = 'nodejs'
const WINDOW_MS = 48 * 60 * 60 * 1000
const SPIKE_MULTIPLIER = 3
const HIDDEN_LINK_THRESHOLD = 0.4

type CallEvent = { id: string; caller: string; receiver: string; timestamp: string; caseId: string; source: string }

function calculateSpikes(events: CallEvent[]) {
  const groups = new Map<string, CallEvent[]>()
  for (const event of events) {
    const key = [event.caller, event.receiver].sort().join('::')
    groups.set(key, [...(groups.get(key) || []), event])
  }
  return Array.from(groups.entries()).flatMap(([key, group]) => {
    if (group.length < 5) return []
    const ordered = group.map((event) => ({ ...event, time: Date.parse(event.timestamp) })).filter((event) => !Number.isNaN(event.time)).sort((a, b) => a.time - b.time)
    if (ordered.length < 5) return []
    const spanWindows = Math.max(1, (ordered.at(-1)!.time - ordered[0].time) / WINDOW_MS)
    const average = ordered.length / spanWindows
    let best: { count: number; start: string; end: string } | undefined
    for (let index = 0; index < ordered.length; index += 1) {
      const end = ordered[index].time + WINDOW_MS
      const window = ordered.filter((event) => event.time <= end)
      if (!best || window.length > best.count) best = { count: window.length, start: new Date(ordered[index].time).toISOString(), end: new Date(end).toISOString() }
    }
    if (!best || best.count <= average * SPIKE_MULTIPLIER) return []
    return [{ type: 'COMMUNICATION_SPIKE', relationship: key, caseId: group[0].caseId, score: Math.min(0.99, best.count / (average * SPIKE_MULTIPLIER)), signals: [`${best.count} calls in 48 hours`, `Baseline density ${average.toFixed(2)} calls per 48 hours`, `Sources: ${Array.from(new Set(group.map((event) => event.source))).join(', ')}`], window: best }]
  })
}

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get('caseId') || ''
  const session = getNeo4jDriver().session()
  try {
    const eventsResult = await session.run(`MATCH (event:CallEvent)
      WHERE $caseId = '' OR event.caseId = $caseId
      RETURN event.id AS id, event.callerPhone AS caller, event.receiverPhone AS receiver,
        toString(event.timestamp) AS timestamp, event.caseId AS caseId, event.source AS source`, { caseId })
    const events = eventsResult.records.map((record) => ({ id: record.get('id'), caller: record.get('caller'), receiver: record.get('receiver'), timestamp: record.get('timestamp'), caseId: record.get('caseId'), source: record.get('source') })) as CallEvent[]
    const peopleResult = await session.run(`MATCH (person:Entity {type: 'PERSON'}) RETURN person.id AS id, person.name AS name`)
    const people = peopleResult.records.map((record) => ({ id: record.get('id') as string, name: record.get('name') as string }))
    const edgeResult = await session.run(`MATCH (a:Entity {type: 'PERSON'})-[r]-(b:Entity {type: 'PERSON'})
      WHERE $caseId = '' OR r.caseId = $caseId OR r.caseId IS NULL
      RETURN a.id AS a, b.id AS b, collect(DISTINCT r.caseId) AS cases, collect(DISTINCT b.id) AS neighborsA`, { caseId })
    const direct = new Set<string>()
    const casesByPerson = new Map<string, Set<string>>()
    const neighbors = new Map<string, Set<string>>()
    for (const record of edgeResult.records) {
      const a = record.get('a') as string
      const b = record.get('b') as string
      direct.add([a, b].sort().join('::'))
      if (!neighbors.has(a)) neighbors.set(a, new Set())
      if (!neighbors.has(b)) neighbors.set(b, new Set())
      neighbors.get(a)!.add(b)
      neighbors.get(b)!.add(a)
      for (const context of (record.get('cases') as (string | null)[]).filter(Boolean) as string[]) {
        if (!casesByPerson.has(a)) casesByPerson.set(a, new Set())
        if (!casesByPerson.has(b)) casesByPerson.set(b, new Set())
        casesByPerson.get(a)!.add(context)
        casesByPerson.get(b)!.add(context)
      }
    }
    const hiddenLinks = []
    for (let left = 0; left < people.length; left += 1) {
      for (let right = left + 1; right < people.length; right += 1) {
        const a = people[left]
        const b = people[right]
        if (direct.has([a.id, b.id].sort().join('::'))) continue
        const commonNeighbors = Array.from(neighbors.get(a.id) || []).filter((id) => (neighbors.get(b.id) || new Set()).has(id))
        const sharedCases = Array.from(casesByPerson.get(a.id) || []).filter((context) => (casesByPerson.get(b.id) || new Set()).has(context))
        const score = Math.min(0.95, 0.15 * commonNeighbors.length + 0.1 * sharedCases.length)
        if (score < HIDDEN_LINK_THRESHOLD) continue
        hiddenLinks.push({ type: 'POTENTIAL_ASSOCIATION', source: a, target: b, status: 'predicted', score, signals: [...commonNeighbors.map((id) => `Common neighbor: ${people.find((person) => person.id === id)?.name || id}`), ...sharedCases.map((context) => `Shared case: ${context}`)] })
      }
    }
    return NextResponse.json({ caseId, patterns: [...calculateSpikes(events), ...hiddenLinks], constants: { windowHours: 48, spikeMultiplier: SPIKE_MULTIPLIER, hiddenLinkThreshold: HIDDEN_LINK_THRESHOLD } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Pattern analysis failed' }, { status: 503 })
  } finally {
    await session.close()
  }
}
