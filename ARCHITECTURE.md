# EvidenceGraph prototype architecture

## Overview

This prototype uses the supplied synthetic dataset as its canonical source and Neo4j as the primary knowledge-graph store. Next.js route handlers are the adapter around Neo4j so the React client never fabricates graph relationships. The local typed graph is retained only as an explicitly labeled offline fallback.

## Project structure

```text
app/
  layout.tsx           Next.js metadata and global shell
  page.tsx             application entry route
  globals.css          global style imports
  api/                 typed Neo4j route handlers
components/
  App.tsx              client landing, login and workspace state
  GraphScene.tsx       interactive vis-network graph with search and focus controls
  AskPanel.tsx         grounded GraphRAG question interface
lib/
  graphRag.ts          Neo4j and vector evidence retrieval
  embeddings.ts        OpenAI embedding provider
  answerQuestion.ts    OpenAI grounded answer generation
  neo4j.ts             shared server-side Neo4j driver
scripts/
  seed.ts              canonical entity and relationship loader
  embed-evidence.ts    evidence chunk embedding and vector-index loader
src/
  data.ts              canonical entities, edges, evidence and derived analytics
neo4j/
  README.md            connection and seed instructions
```

## Graph schema

- `Entity(id, type, canonicalName, aliases, jurisdiction, linkedEntityId)`
- `Relationship(id, subject, object, type, status, confidence, evidence[], timestamp?)`
- `Evidence(id, sourceType, sourceId, title, caseId, timestamp, excerpt, hash, integrity)`
- `Case(id, title, status, priority, jurisdiction, evidenceCount)`
- `Lead(id, subject, object, score, signals[], status)`

Every relationship carries evidence references and an explicit status: `observed`, `corroborated`, or `predicted`.

## Computation provenance

The `/api/provenance` route uses persisted resource commitments and processing events when live resources exist. Each event commits its inputs and outputs with SHA-256 and includes the previous event hash. The Integrity view displays and verifies the resulting chain root. A deterministic fallback remains available only when no live resource records exist.

This is a tamper-evident computation trail, not yet a blockchain or zero-knowledge proof. It proves that the declared event sequence is internally consistent. Future ZK integration should prove the deterministic graph-analysis program over a committed graph snapshot, while OpenAI answer generation remains recorded with model, context, and citation metadata.

## Ingestion strategy

1. Load `canonical_entities.csv` first to establish stable IDs and alias resolution.
2. Normalize CDR, financial, surveillance, vehicle and history CSV rows into typed events.
3. Extract document metadata and text spans from FIR, police, court, intelligence and transcript sources.
4. Resolve raw mentions only when supported by the canonical mapping; preserve the original mention and source span.
5. Materialize graph edges with provenance, then derive centrality, communities, patterns and explainable leads.
6. Hash encrypted off-chain evidence and record hash metadata in a permissioned-ledger adapter.

## Route/page map

The prototype uses a unified workspace shell instead of disconnected workspace pages:

- `/` landing page
- `/` landing, login and workspace shell
- `/api/graph` Neo4j graph data
- `/api/entity/:id` entity details
- `/api/ask` case-scoped GraphRAG answers
- `/api/health` Neo4j health check

Workspace sections are local client-side view states in `components/App.tsx`.

## Implementation phases

1. Canonical dataset contracts and Neo4j seeded ingestion model
2. Investigator shell, case/evidence flow and entity resolution surfaces
3. Interactive 2D graph and explainability drawer
4. Network analytics, leads, patterns and timeline
5. Security posture, RBAC, audit trail and integrity demonstration
6. GraphRAG grounding, citations and end-to-end verification

## Production considerations

The prototype Graph RAG generation step in `lib/answerQuestion.ts` calls a public OpenAI API. A production deployment handling real FIR, CDR, or investigative records should route generation through a self-hosted or India-sovereign model hosted inside a government-controlled environment. Sensitive case content, retrieved excerpts, graph context, and citations should not leave that controlled boundary.
