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
  GraphScene.tsx       interactive Three.js graph with orbit controls
lib/
  neo4j.ts             shared server-side Neo4j driver
src/
  data.ts              canonical entities, edges, evidence and derived analytics
scripts/
  seed.ts              canonical entity and relationship loader
  graph/route.ts       Neo4j graph query endpoint
  entity/[id]/route.ts entity detail endpoint
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

## Ingestion strategy

1. Load `canonical_entities.csv` first to establish stable IDs and alias resolution.
2. Normalize CDR, financial, surveillance, vehicle and history CSV rows into typed events.
3. Extract document metadata and text spans from FIR, police, court, intelligence and transcript sources.
4. Resolve raw mentions only when supported by the canonical mapping; preserve the original mention and source span.
5. Materialize graph edges with provenance, then derive centrality, communities, patterns and explainable leads.
6. Hash encrypted off-chain evidence and record hash metadata in a permissioned-ledger adapter.

## Route/page map

The prototype uses a unified workspace shell instead of 17 disconnected pages:

- `/` landing page
- `/login` role-aware access gate
- `/workspace` dashboard, cases and evidence inbox
- `/workspace/resources` resource library, upload flow and graph impact
- `/workspace/network` 3D network and relationship explorer
- `/workspace/intelligence` leads, patterns and timeline
- `/workspace/integrity` evidence hash verification, security and audit

## Implementation phases

1. Canonical dataset contracts and Neo4j seeded ingestion model
2. Investigator shell, case/evidence flow and entity resolution surfaces
3. Interactive 3D graph and explainability drawer
4. Network analytics, leads, patterns and timeline
5. Security posture, RBAC, audit trail and integrity demonstration
6. Landing/login polish and end-to-end verification
