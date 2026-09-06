export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}

class OpenAIEmbeddings implements EmbeddingProvider {
  constructor(private readonly apiKey: string, private readonly model = 'text-embedding-3-small') {}

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    })
    if (!response.ok) throw new Error(`Embeddings request failed: ${response.status}`)
    const data = (await response.json()) as { data: { embedding: number[] }[] }
    return data.data.map((item) => item.embedding)
  }
}

class VoyageEmbeddings implements EmbeddingProvider {
  constructor(private readonly apiKey: string, private readonly model = 'voyage-3-lite') {}

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    })
    if (!response.ok) throw new Error(`Embeddings request failed: ${response.status}`)
    const data = (await response.json()) as { data: { embedding: number[] }[] }
    return data.data.map((item) => item.embedding)
  }
}

let cached: EmbeddingProvider | undefined

export function getEmbeddingProvider(): EmbeddingProvider {
  if (cached) return cached
  if (process.env.EMBEDDINGS_PROVIDER === 'voyage') {
    if (!process.env.VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY is not set')
    cached = new VoyageEmbeddings(process.env.VOYAGE_API_KEY, process.env.VOYAGE_MODEL)
  } else {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
    cached = new OpenAIEmbeddings(process.env.OPENAI_API_KEY, process.env.OPENAI_EMBEDDING_MODEL)
  }
  return cached
}
