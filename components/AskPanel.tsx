'use client'

import { useState } from 'react'

type AskResponse = {
  answer: string
  citedSources: string[]
  mentionedEntities: { id: string; name: string }[]
  factCount: number
  evidenceCount: number
  caseId: string
}

export function AskPanel({ onCiteClick, onEntityClick }: { onCiteClick?: (sourceId: string) => void; onEntityClick?: (id: string) => void }) {
  const [question, setQuestion] = useState('Why is Vikram Malhotra considered a potential intermediary?')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAsk() {
    if (!question.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, caseId: 'CASE-1004' }) })
      const data = (await response.json()) as AskResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Request failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function renderAnswer(text: string) {
    return text.split(/(\[[A-Z0-9_-]+\])/g).map((part, index) => {
      const match = part.match(/^\[([A-Z0-9_-]+)\]$/)
      if (!match) return <span key={index}>{part}</span>
      return <button className="text-button" key={index} onClick={() => onCiteClick?.(match[1])}>[{match[1]}]</button>
    })
  }

  return <section className="panel graph-rag-panel">
    <div className="panel-heading"><div><span className="eyebrow">GRAPH RAG / CASE-1004</span><h2>Ask the evidence graph</h2></div><span className="status-pill corroborated"><i /> Grounded retrieval</span></div>
    <p className="panel-intro">Ask a question about the active investigation. Answers combine Neo4j relationships with source excerpts and retain the distinction between observed, corroborated and predicted signals.</p>
    <div className="graph-rag-input"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleAsk()} placeholder="Ask about CASE-1004..." /><button className="primary-button small" onClick={handleAsk} disabled={loading}>{loading ? 'Retrieving...' : 'Ask'}</button></div>
    {error && <p className="graph-rag-error">{error}</p>}
    {result && <div className="graph-rag-result"><div className="graph-rag-answer">{renderAnswer(result.answer)}</div><div className="graph-rag-meta">Grounded in {result.factCount} graph fact(s) and {result.evidenceCount} evidence excerpt(s) · {result.caseId}</div>{result.mentionedEntities.length > 0 && <div className="signal-tags">{result.mentionedEntities.map((entity) => <button key={entity.id} onClick={() => onEntityClick?.(entity.id)}><span>{entity.name}</span> <small>{entity.id}</small></button>)}</div>}</div>}
  </section>
}
