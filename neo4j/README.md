# Neo4j graph setup

The application treats Neo4j as the primary graph store. The seed is intentionally provenance-aware and keeps source IDs, case IDs, timestamps, statuses, and relationship type on graph properties.

The repository includes a Docker Compose setup. Start Docker Desktop first, then run:

```bash
docker compose up -d neo4j
```

Neo4j Browser is available at `http://localhost:7474` with username `neo4j` and password `evidencegraph`.

```bash
NEO4J_URI=bolt://localhost:7687 \
NEO4J_USER=neo4j \
NEO4J_PASSWORD=evidencegraph \
npm run seed:neo4j
```

Start the API separately with `npm run api`. The frontend queries `GET /api/graph`; when the API is unavailable it uses the same typed local fallback and marks that state in the graph toolbar rather than pretending Neo4j is connected.

Node labels are `Entity` and `Case`. Relationships include `USES`, `OWNS`, `CONTROLS`, `CALLS`, `VISITED`, `MENTIONED_IN`, `APPEARED_IN`, and generic `RELATES` records for the canonical ground-truth associations.
