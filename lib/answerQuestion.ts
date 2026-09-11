const SYSTEM_PROMPT = `You are EvidenceGraph's evidence-grounded investigative assistant.

Use ONLY the supplied context. Every material claim must include a source ID in brackets, such as [FIR-1004]. If the context is insufficient, say so. Never invent relationships, events, identities, or citations.

Use neutral language: observed relationship, corroborated relationship, predicted relationship, potential association, investigative lead, and potential intermediary. Never describe anyone as guilty, criminal, or a mastermind. A predicted relationship is not direct proof.`

export type AskResult = { answer: string; citedSources: string[] }

export async function answerQuestion(question: string, context: string): Promise<AskResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set. Add it to .env.local and restart the development server.')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
      ],
    }),
  })
  if (!response.ok) throw new Error(`LLM request failed: ${response.status}`)
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const answer = data.choices?.[0]?.message?.content?.trim() || ''
  if (!answer) throw new Error('OpenAI returned an empty answer')
  const citedSources = Array.from(new Set(Array.from(answer.matchAll(/\[([A-Z0-9_-]+)\]/g)).map((match) => match[1])))
  return { answer, citedSources }
}
