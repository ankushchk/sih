# Backend Deployment

The app can be deployed to Vercel as a Next.js frontend/API layer, but Vercel does not provide the local services used by the prototype. Configure these before using graph, patterns, upload, or GraphRAG routes.

## Required Vercel variables

```text
NEO4J_URI=neo4j+s://<your-aura-instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<secret>
OPENAI_API_KEY=<secret>
OPENAI_CHAT_MODEL=gpt-4.1-mini
EMBEDDINGS_PROVIDER=openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Do not use `bolt://localhost:7687` on Vercel. That points to the serverless function's own container, not your development machine.

## Initialize Neo4j

Run migrations from a machine that has access to the configured Neo4j instance:

```bash
NEO4J_URI="neo4j+s://..." \
NEO4J_USER="neo4j" \
NEO4J_PASSWORD="..." \
npm run seed:neo4j

npm run migrate:cases
npm run migrate:relationship-cases
npm run migrate:cdr-events
npm run migrate:sensitivity
npm run migrate:remove-demo-leads
npm run import:epstein
```

## Resource storage limitation

The current local upload implementation writes files and metadata to `.data/`. Vercel serverless filesystems are ephemeral, so uploaded resources are not durable there. The existing API now returns an explicit `503` storage error instead of a generic `500` when that local store is unavailable.

For a deployed upload workflow, move resource bytes and metadata to a persistent service, then keep Neo4j as the graph/provenance store. Until that adapter exists, Vercel deployment supports the seeded graph, imported Epstein corpus, case-scoped graph routes, patterns, provenance, and GraphRAG only after the required environment variables and Neo4j data are configured.

## Verification

```bash
curl "https://<deployment>/api/health"
curl "https://<deployment>/api/cases"
curl "https://<deployment>/api/graph?caseId=CASE-1004&limit=20"
curl "https://<deployment>/api/patterns?caseId=CASE-1004"
```
