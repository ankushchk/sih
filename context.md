# EvidenceGraph Project Context

This document is the project handoff summary for future developers and AI coding assistants. It records the product decisions, implementation history, current architecture, known limitations, and recommended next steps.

## Product

EvidenceGraph is a synthetic investigator workspace for:

```text
SIH26189 — AI-Powered Criminal Network Analysis System
Ministry of Home Affairs
National Crime Records Bureau
Women Safety Division
Theme: Blockchain & Cybersecurity
```

Product tagline:

```text
Connect the evidence. Reveal the network. Explain every connection.
```

The product is not intended to be a simple graph viewer. It is intended to connect fragmented evidence, extract entities, resolve aliases, build an evidence-aware graph, identify investigative leads, and explain every important connection.

The system must use neutral language:

- Investigative lead
- Potential association
- Observed relationship
- Corroborated relationship
- Predicted relationship
- Potential intermediary

The system must not predict guilt or infer that a person is a criminal.

## Canonical Dataset

The supplied synthetic dataset is the canonical source:

```text
EvidenceGraph_Synthetic_Dataset/
```

Important folders and files:

```text
01_firs/
02_police_reports/
03_cdr/cdr_records.csv
04_financial/transactions.csv
05_surveillance/surveillance_events.csv
06_vehicle/vehicle_registry.csv
07_court/
08_audio_transcripts/hearing_transcripts.txt
09_osint/social_posts.json
10_criminal_history/criminal_history.csv
11_intelligence/
12_ground_truth/canonical_entities.csv
12_ground_truth/ground_truth_relationships.csv
12_ground_truth/expected_leads.csv
13_website_demo/prebuilt_graph_edges.json
13_website_demo/relationship_explanations.json
13_website_demo/case_demo.json
```

Important canonical entities:

```text
P001 — Rahul Sharma / Raju
P002 — Sameer Khan / Sam
P003 — Vikram Malhotra / Vicky
P004 — Rakesh Yadav / Rocky
P005 — Imran Ali / Immi
P006–P012 — additional canonical people
```

Important ground-truth relationships:

- Rahul and Sameer: observed meeting
- Rahul and Vikram: corroborated association
- Sameer and Vikram: corroborated association
- Vikram and Rakesh: corroborated association
- Rahul and Rakesh: corroborated association
- Vikram and Imran: corroborated association
- Rakesh and Imran: observed financial association
- Rahul and Imran: predicted potential association

Expected high-priority lead:

```text
P003 — Vikram Malhotra
Reason: cross-case, cross-city, and cross-community connectivity.
```

Primary demonstration case:

```text
CASE-1004 — Cafe Meridian Network Demonstration
```

## Product Workflow

```text
FIRs / CDRs / financial / surveillance / OSINT / transcripts
        ↓
Ingestion and normalization
        ↓
Entity extraction
        ↓
Entity resolution
        ↓
Neo4j knowledge graph
        ↓
Network analytics
        ↓
Explainable investigative leads
        ↓
Evidence provenance and integrity
```

The intended primary demo flow is:

```text
Open CASE-1004
  ↓
Review FIR, CDR, surveillance, financial, and transcript evidence
  ↓
Extract Rahul, Vikram, Rakesh, Cafe Meridian, phones, vehicles, and accounts
  ↓
Resolve aliases to canonical entities
  ↓
Create source-aware relationships
  ↓
Open the knowledge graph
  ↓
Highlight Vikram as a potential intermediary
  ↓
Explain why each important relationship exists
  ↓
Show the Rahul–Imran predicted lead separately
  ↓
Verify evidence integrity
```

## Relationship Statuses

Relationships must retain one of these statuses:

```text
OBSERVED
Directly present in source material.

CORROBORATED
Supported by multiple independent source types.

PREDICTED
Inferred analytical lead. Not direct proof.
```

The frontend should visually distinguish them:

- Observed: solid relationship line
- Corroborated: thicker relationship line
- Predicted: dashed relationship line

Every important relationship should retain:

```text
sourceId
resourceId
caseId
timestamp
confidence
status
evidenceRefs
```

## Current Technology

The project was initially created as a Vite React application and was later migrated to Next.js.

Current stack:

```text
Next.js App Router
React
TypeScript
vis-network
vis-data
Neo4j Driver
Lucide React
```

Three.js remains in `package.json` but is no longer the active graph renderer and can be removed after confirming it is not used elsewhere.

Current scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run seed:neo4j
```

Note: `npm run lint` currently runs `tsc --noEmit`. It is a TypeScript validation command, not a full ESLint run.

## Project Structure

```text
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    graph/route.ts
    health/route.ts
    entity/[id]/route.ts

components/
  App.tsx
  GraphScene.tsx

lib/
  neo4j.ts

scripts/
  seed.ts

src/
  data.ts
  styles.css
  resource.css
  landing.css
  hero-reference.css
  graph-ui.css
  graph-size.css
  vis-graph.css
  density.css
  neo.css
  monochrome.css

neo4j/
  README.md

docker-compose.yml
next.config.ts
next-env.d.ts
tsconfig.json
package.json
reference.png
```

## Neo4j Architecture

Neo4j is intended to be the primary graph database and source of truth.

```text
Browser
  ↓
Next.js route handler
  ↓
Neo4j Driver
  ↓
Neo4j database
```

The browser must not connect directly to Neo4j and must never receive Neo4j credentials.

Current route handlers:

```text
GET /api/graph
GET /api/entity/:id
GET /api/health
```

Neo4j environment variables:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=evidencegraph
```

For production, use Neo4j Aura:

```env
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

Neo4j node concepts include:

```text
Entity
Case
Resource
Document
Event
```

Entity types include:

```text
PERSON
PHONE
VEHICLE
BANK_ACCOUNT
LOCATION
ORGANIZATION
```

Relationship types include:

```text
USES
OWNS
CONTROLS
CALLS
VISITED
TRANSFERRED_TO
MENTIONED_IN
APPEARED_IN
RELATES
```

The current `scripts/seed.ts` creates a manually encoded subset of the canonical graph. It should eventually be replaced by a complete ingestion pipeline that reads the supplied CSV, JSON, transcript, and document sources.

## vis-network

`vis-network` is only the frontend visualization layer.

```text
Neo4j       = graph database and source of truth
vis-network = graph visualization
Next.js     = frontend and API layer
```

The current graph supports:

- 2D node and edge rendering
- Dragging nodes
- Panning
- Zooming
- Hover tooltips
- Click-to-inspect nodes
- Star shapes for bridge candidates
- Triangle shapes for highly connected entities
- Dot shapes for standard entities
- Larger nodes for higher connectivity
- Thicker corroborated edges
- Dashed predicted edges
- Reset layout control
- Source-aware relationship tooltips

The graph reference image is stored at:

```text
reference.png
```

The visual direction from the reference includes a large dark canvas, colored clusters, large labels, variable node sizes, star/triangle shapes, and thick relationships.

Current cluster colors are based on jurisdiction:

```text
Delhi: red
Noida: yellow
Ghaziabad: blue
Gurugram: green
```

These are currently visual groupings. Real community detection is still required.

## Resource Library

The frontend includes a Resource Library for:

- FIRs
- CDR extracts
- Financial records
- Surveillance records
- Transcripts
- Police reports
- Other synthetic evidence

Resource features currently include:

- Search
- Source-type filters
- Resource selection
- Resource metadata
- Processing status
- Entity counts
- Relationship counts
- SHA-256 display
- Graph impact summary
- Resource detail tabs
- File picker for PDF, CSV, JSON, and TXT files

Resource detail tabs:

```text
Overview
Extracted intelligence
Graph impact
Integrity
```

Important limitation:

```text
The file picker currently adds a selected file to temporary client-side state only.
```

It does not yet:

- Persist uploaded files
- Store files in object storage
- Extract document text
- Parse CSV rows
- Resolve aliases dynamically
- Generate candidate relationships
- Write new relationships to Neo4j
- Refresh the graph with new relationships

## Landing Hero

The existing Hero content was preserved and visually redesigned.

Existing headline:

```text
Connect the evidence.
Reveal the network.
```

Existing description:

```text
EvidenceGraph turns fragmented case material into a living,
explainable intelligence workspace. Every connection has a source.
Every lead shows its reasoning.
```

Existing CTA:

```text
Enter investigation workspace
```

Existing proof points:

```text
14 source types connected
01 unified evidence graph
WHY before every important insight
```

The exact requested background video is used:

```text
https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4
```

Hero styling is in:

```text
src/hero-reference.css
```

The Hero includes:

- Full viewport video background
- Dark overlay
- BubbledotICG-FinePos display font
- Geist Pixel Circle fallback
- Inter UI font
- White solid display headline
- White pill CTA
- Subtle entrance animations
- Responsive behavior
- Reduced-motion support
- Fixed proof-point alignment
- Footer overlap fix

Only the existing landing Hero was intended to be changed during that redesign.

## Current UI Sections

The unified workspace currently includes:

- Command center
- Cases
- Evidence inbox
- Resource library
- Network graph
- Intelligence
- Timeline
- Security and access
- Evidence integrity

These are primarily local view states inside `components/App.tsx`, not separate Next.js routes yet.

The application currently starts at:

```text
Landing
  ↓
Login
  ↓
Knowledge graph workspace
```

The graph was made the default post-login workspace view so the Neo4j/vis-network graph is visible immediately.

## Current Working Features

Working:

- Next.js app startup
- Next.js production build
- TypeScript validation
- Landing page
- Login transition
- Workspace navigation
- Resource filtering
- Resource search
- Local file selection
- Interactive vis-network graph
- Graph node selection
- Graph fetch from `/api/graph`
- Neo4j API route structure
- Neo4j seed command structure
- Local fallback graph
- Observed/corroborated/predicted relationship display
- Hero background video
- Responsive Hero layout

Validation commands:

```bash
npm run lint
npm run build
```

## Current Limitations

### Dataset and ingestion

- Full dataset ingestion is not dynamically implemented.
- The seed script manually encodes a subset of records.
- PDF extraction is not implemented.
- Transcript processing is not dynamic.
- Uploaded resources do not persist.

### Graph

- Neo4j must be running or the frontend uses the local fallback graph.
- Community colors are not actual community-detection results yet.
- Centrality values are partly seeded.
- Graph statistics are partly static.
- Path explorer does not yet calculate a real path.
- Expand-two-hops is not fully implemented.
- Graph filters are mostly presentation controls.

### Uploads

- Upload is frontend-only.
- No object storage exists yet.
- No processing queue exists.
- No extraction review backend exists.
- No Neo4j mutation occurs after upload approval.

### Security

- Login is a UI simulation.
- MFA is a UI concept.
- RBAC is shown visually but not enforced server-side.
- Audit trail entries are seeded.
- Integrity verification is partly simulated.

### Blockchain

- No Hyperledger Fabric deployment exists.
- Hash records are currently demo data.
- A provenance abstraction still needs implementation.

### Code organization

- `components/App.tsx` is still very large.
- Many sections are local view states instead of real routes.
- `ARCHITECTURE.md` may contain stale references and should be kept synchronized.
- `three` remains in dependencies even though `vis-network` is the active graph renderer.
- Unused style files may be removed after verifying imports.

## Recommended Roadmap

### Phase 1: Clean the codebase

- Update architecture documentation
- Remove unused Three.js dependency if confirmed unused
- Remove unused CSS layers
- Split `App.tsx` into smaller components
- Add real ESLint configuration
- Add test setup

### Phase 2: Real resource API

Add:

```text
POST /api/resources
GET /api/resources
GET /api/resources/:id
POST /api/resources/:id/process
GET /api/resources/:id/extractions
GET /api/resources/:id/connections
POST /api/resources/:id/approve
```

Use S3-compatible object storage or Vercel Blob for production uploads. Do not rely on a deployed server's local filesystem.

### Phase 3: Ingestion adapters

Create typed adapters:

```text
PdfResourceAdapter
CsvResourceAdapter
JsonResourceAdapter
TranscriptResourceAdapter
```

Each adapter should preserve:

```text
Source file
Source ID
Case ID
Excerpt
Timestamp
Raw mention
Canonical ID
Confidence
```

### Phase 4: Neo4j graph mutation

Add:

- Resource nodes
- Document nodes
- Event nodes
- Evidence provenance edges
- Approved relationship writes
- Graph refresh after approval

### Phase 5: Analytics

Implement dynamic:

- Degree centrality
- Betweenness centrality
- PageRank
- Community detection
- Shortest path
- Multi-hop expansion
- Temporal filtering
- Communication spike detection
- Location convergence detection
- Transaction chain detection

Neo4j Graph Data Science is a good fit for these operations.

### Phase 6: Link prediction

Use an interpretable first-stage model based on:

- Common neighbors
- Shared cases
- Shared locations
- Communication paths
- Financial paths
- Temporal overlap
- Cross-source count
- Intermediary signals

Output:

```text
Predicted relationship
Score
Signals
Supporting evidence
What is not proven
```

Do not claim deep-learning accuracy with the small synthetic dataset.

### Phase 7: Security

Implement:

- Real authentication
- MFA provider or adapter
- RBAC middleware
- Case-level permissions
- Audit API
- Protected graph routes
- Secure upload handling

### Phase 8: Integrity

Implement:

- Real file hashing
- Hash verification
- Tamper simulation
- Chain-of-custody events
- Permissioned-ledger adapter
- Evidence verification UI

### Phase 9: Deployment

Recommended deployment architecture:

```text
Next.js application
  ↓
Neo4j Aura
  ↓
S3-compatible object storage
```

Docker is useful for local development but should not be required in production if Neo4j Aura is used.

## Most Important Next Milestone

Implement the full resource-to-graph vertical slice:

```text
Upload FIR
  ↓
Store resource
  ↓
Calculate SHA-256
  ↓
Extract Rahul, Vikram, Rakesh, and Cafe Meridian
  ↓
Resolve canonical IDs
  ↓
Show review screen
  ↓
Approve connections
  ↓
Write approved edges to Neo4j
  ↓
Refresh vis-network graph
  ↓
Click edge
  ↓
Open source excerpt
```

Until this works, EvidenceGraph is a polished graph and workspace prototype around seeded data rather than a complete evidence-processing system.

## Product Guardrails

Do not:

- Replace the supplied dataset with unrelated random data
- Import unrelated P0001/P0002 reference data as canonical data
- Predict guilt
- Label people as criminals based on graph patterns
- Present predicted relationships as facts
- Let an LLM invent unsupported graph relationships
- Expose Neo4j credentials to the browser
- Store full evidence files directly on-chain
- Use localhost URLs in production frontend code
- Hide source provenance
- Show every metric on every screen
- Modify unrelated sections when changing the Hero

Always preserve the distinction between:

```text
Observed
Corroborated
Predicted
```

## Local Development

From the repository root:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Typecheck:

```bash
npm run lint
```

Build:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Start local Neo4j:

```bash
docker compose up -d neo4j
```

Seed Neo4j:

```bash
npm run seed:neo4j
```

Neo4j Browser:

```text
http://localhost:7474
```

## Final Status

EvidenceGraph currently has:

- A Next.js TypeScript application
- A polished landing Hero
- A login transition
- A professional investigation workspace
- A vis-network graph UI
- Neo4j route handlers
- A Neo4j seed utility
- A Resource Library
- Evidence and provenance concepts
- Security and integrity UI
- Synthetic dataset-backed fallback data

The largest missing capability is:

```text
Uploaded resource → extraction → review → Neo4j mutation → refreshed graph
```

That should be the next implementation priority.
