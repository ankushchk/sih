# EvidenceGraph — Synthetic Multi-Source Investigation Dataset

**IMPORTANT:** Everything in this package is fictional and synthetic. It is for SIH prototype/demo use only. It is not real NCRB, police, CDR, financial, court, intelligence, or personal data.

## Goal

This package intentionally splits one fictional investigation across many evidence sources. The website can demonstrate:

- extracting entities from unstructured reports;
- matching aliases such as Rahul Sharma → Raju;
- converting structured records into relationships;
- corroborating a relationship with multiple sources;
- generating a separate predicted relationship/lead;
- finding an important bridge person using graph analysis;
- showing the source evidence behind every edge.

## Folders

1. `01_firs/` — 5 FIR PDFs
2. `02_police_reports/` — 4 police-report PDFs
3. `03_cdr/` — CDR CSV
4. `04_financial/` — transaction CSV
5. `05_surveillance/` — surveillance-event CSV
6. `06_vehicle/` — vehicle registry CSV
7. `07_court/` — court-record PDFs
8. `08_audio_transcripts/` — hearing transcripts + audio metadata (actual audio not included)
9. `09_osint/` — synthetic social/OSINT JSON
10. `10_criminal_history/` — historical-case CSV
11. `11_intelligence/` — intelligence-report PDFs
12. `12_ground_truth/` — canonical entities, intended relationships, expected leads
13. `13_website_demo/` — frontend/demo-ready graph edges and explanation objects

## How the website should demonstrate the links

### 1. Source evidence

Open an FIR, for example:

> Rahul Sharma met Sameer Khan near Warehouse 7.

### 2. Extraction

Convert that sentence into:

- PERSON: Rahul Sharma
- PERSON: Sameer Khan
- LOCATION: Warehouse 7
- DATE: 12 August 2026
- RELATION: Rahul — MET → Sameer

### 3. Cross-source connection

CDR shows repeated communication.

Surveillance shows the two people at the same location.

The graph can therefore classify the relationship as **CORROBORATED**, while keeping the underlying source IDs.

### 4. Hidden/predicted connection

Use the example edge:

`Rahul — - - - POTENTIAL_ASSOCIATION - - - → Imran`

This is a **lead**, not proof. Explain it using graph paths, shared case context and temporal overlap.

### 5. Important person

P003 (Vikram Malhotra) is deliberately positioned as a cross-community/intermediary candidate. Demonstrate:

- betweenness centrality;
- degree;
- community membership;
- cross-case appearances.

### 6. Evidence explanation panel

When a user clicks an edge, show:

- relationship type;
- observed/corroborated/predicted status;
- confidence/score;
- exact source documents;
- dates/times;
- relevant transcript excerpt.

## Suggested graph model

### Nodes

`Person`, `Phone`, `Vehicle`, `BankAccount`, `Location`, `Organization`, `Case`, `Document`, `Audio`, `Event`

### Relationships

`CALLS`, `MET`, `USES`, `OWNS`, `TRANSFERRED_TO`, `VISITED`, `WORKS_FOR`, `MEMBER_OF`, `MENTIONED_IN`, `OCCURRED_AT`, `SUPPORTED_BY`, `ASSOCIATED_WITH`

## Website demo flow

```text
CASE
  ↓
EVIDENCE INBOX
  ↓
OPEN FIR / CDR / TRANSACTION / SURVEILLANCE / AUDIO
  ↓
EXTRACT ENTITIES & EVENTS
  ↓
RESOLVE ALIASES
  ↓
BUILD GRAPH
  ↓
RUN NETWORK ANALYSIS
  ↓
HIGHLIGHT KEY PERSON / PATTERN
  ↓
CLICK EDGE
  ↓
SHOW "WHY THIS CONNECTION?"
  ↓
SHOW SUPPORTING EVIDENCE
```

## Relationship statuses

**OBSERVED:** directly stated or directly recorded.

**CORROBORATED:** supported by multiple independent source types.

**PREDICTED:** a potential link inferred from graph/data patterns. Always present this as an investigative lead, not proof.

## Recommended first implementation task

1. Load all CSV/JSON files.
2. Extract entities from the PDF/text sources.
3. Resolve aliases using `canonical_entities.csv`.
4. Build graph nodes and edges.
5. Store `source` on every edge.
6. Render the graph.
7. Implement the "Why this relationship?" panel.
8. Run centrality/community analysis.
9. Add predicted edges separately.
10. Add evidence-hash verification as a later security/blockchain step.
