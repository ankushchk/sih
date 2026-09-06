export type EntityType = 'PERSON' | 'PHONE' | 'VEHICLE' | 'BANK_ACCOUNT' | 'LOCATION' | 'ORGANIZATION'
export type RelationshipStatus = 'observed' | 'corroborated' | 'predicted'

export type Entity = {
  id: string
  type: EntityType
  name: string
  alias?: string
  jurisdiction?: string
  role?: string
}

export type Evidence = {
  id: string
  type: string
  title: string
  caseId: string
  timestamp: string
  excerpt: string
  hash: string
  integrity: 'verified' | 'mismatch'
}

export type Resource = Evidence & {
  filename: string
  size: string
  status: 'processed' | 'ready' | 'review' | 'approved'
  entities: number
  relationships: number
  addedBy: string
}

export type Relationship = {
  id: string
  source: string
  target: string
  type: string
  status: RelationshipStatus
  confidence: number
  evidence: string[]
  timestamp?: string
}

export const people: Entity[] = [
  ['P001', 'Rahul Sharma', 'Raju', 'Delhi', 'Subject of interest'],
  ['P002', 'Sameer Khan', 'Sam', 'Noida', 'Person of interest'],
  ['P003', 'Vikram Malhotra', 'Vicky', 'Delhi', 'Potential intermediary'],
  ['P004', 'Rakesh Yadav', 'Rocky', 'Ghaziabad', 'Person of interest'],
  ['P005', 'Imran Ali', 'Immi', 'Noida', 'Person of interest'],
  ['P006', 'Neha Verma', 'Neha', 'Delhi', 'Witness'],
  ['P007', 'Arjun Mehta', 'A.M.', 'Gurugram', 'Person of interest'],
  ['P008', 'Kavya Singh', 'Kavya', 'Noida', 'Person of interest'],
  ['P009', 'Deepak Rao', 'Deep', 'Ghaziabad', 'Person of interest'],
  ['P010', 'Mohit Sethi', 'M.S.', 'Delhi', 'Person of interest'],
  ['P011', 'Sana Qureshi', 'Sana', 'Noida', 'Witness'],
  ['P012', 'Ajay Batra', 'Ajay', 'Delhi', 'Person of interest'],
].map(([id, name, alias, jurisdiction, role]) => ({ id, type: 'PERSON', name, alias, jurisdiction, role }))

export const secondaryEntities: Entity[] = [
  { id: 'PH001', type: 'PHONE', name: '9000000001', role: 'linked phone' },
  { id: 'V001', type: 'VEHICLE', name: 'White SUV · DL01AB1234', role: 'registered to P001' },
  { id: 'A001', type: 'BANK_ACCOUNT', name: 'Northline Trading', role: 'linked account' },
  { id: 'L001', type: 'LOCATION', name: 'Warehouse 7', jurisdiction: 'Noida' },
  { id: 'L003', type: 'LOCATION', name: 'Cafe Meridian', jurisdiction: 'Delhi' },
]

export const evidence: Evidence[] = [
  { id: 'FIR-1004', type: 'FIR', title: 'FIR-1004 · Cafe Meridian incident', caseId: 'CASE-1004', timestamp: '20 Aug 2026 · 17:32', excerpt: 'Rahul Sharma, Vikram Malhotra and Rakesh Yadav were identified in the Cafe Meridian incident context.', hash: 'a7b3c912…e81d', integrity: 'verified' },
  { id: 'CDR', type: 'CDR', title: 'CDR extract · linked phones', caseId: 'CASE-1004', timestamp: '17–26 Aug 2026', excerpt: 'Repeated communication between linked phones PH001, PH003 and PH004. Tower sequence includes TWR-DEL-MER and TWR-NOI-W7.', hash: '4f90d2aa…b102', integrity: 'verified' },
  { id: 'SURV-0012', type: 'SURVEILLANCE', title: 'SURV-0012 · Cafe Meridian', caseId: 'CASE-1004', timestamp: '20 Aug 2026 · 17:51', excerpt: 'Rakesh Yadav and vehicle UP14EF9090 observed at L003 within the case event window.', hash: '8d2ef40c…9d31', integrity: 'verified' },
  { id: 'PR-2004', type: 'POLICE REPORT', title: 'PR-2004 · scene correlation', caseId: 'CASE-1004', timestamp: '21 Aug 2026', excerpt: 'Scene notes cross-reference the Cafe Meridian observation with the linked vehicle registry.', hash: 'c1210ff4…c40a', integrity: 'verified' },
  { id: 'AUDIO-001', type: 'TRANSCRIPT', title: 'HEARING-001 · transcript intelligence', caseId: 'CASE-1004', timestamp: '20 Aug 2026 · 00:04:21', excerpt: '“I met Rakesh at the Cafe Meridian on the 20th before speaking to Vikram.” Rahul came shortly after.', hash: 'e3817b09…6c42', integrity: 'verified' },
  { id: 'FIR-1001', type: 'FIR', title: 'FIR-1001 · Warehouse 7', caseId: 'CASE-1001', timestamp: '12 Aug 2026 · 20:15', excerpt: 'Rahul Sharma met Sameer Khan near Warehouse 7. Vikram Malhotra appears in the related context.', hash: 'f7c0a193…d00e', integrity: 'verified' },
  { id: 'SURV-0001', type: 'SURVEILLANCE', title: 'SURV-0001 · Warehouse 7 arrival', caseId: 'CASE-1001', timestamp: '12 Aug 2026 · 20:15', excerpt: 'Rahul Sharma arrived at Warehouse 7 in the registered white SUV.', hash: 'bb70a1dd…62aa', integrity: 'verified' },
  { id: 'TXN-0004', type: 'FINANCIAL', title: 'TXN-0004 · account transfer', caseId: 'CASE-1003', timestamp: '18 Aug 2026', excerpt: 'A004 transferred INR 310,000 to A005. This is an observed financial relationship, not a classification of legality.', hash: '90b81d40…c18a', integrity: 'mismatch' },
]

export const resources: Resource[] = [
  ...evidence.map((item, index) => ({ ...item, filename: `${item.id}.${item.type === 'FIR' || item.type === 'POLICE REPORT' ? 'pdf' : item.type === 'CDR' || item.type === 'FINANCIAL' || item.type === 'SURVEILLANCE' ? 'csv' : 'txt'}`, size: `${(0.4 + index * 0.18).toFixed(1)} MB`, status: index < 5 ? 'processed' as const : index === 7 ? 'review' as const : 'ready' as const, entities: [4, 12, 3, 5, 4, 4, 3, 6][index], relationships: [2, 16, 2, 4, 3, 2, 2, 1][index], addedBy: index < 6 ? 'Forensic analyst' : 'Ingestion service' })),
  { id: 'cdr_records', filename: 'cdr_records.csv', type: 'CDR', title: 'CDR master extract · 182 records', caseId: 'MULTI-CASE', timestamp: '01–26 Aug 2026', excerpt: '182 synthetic call detail records across twelve linked phones and five case contexts.', hash: '0b4c7d11…a990', integrity: 'verified', size: '18.4 KB', status: 'processed', entities: 12, relationships: 38, addedBy: 'Ingestion service' },
  { id: 'transactions', filename: 'transactions.csv', type: 'FINANCIAL', title: 'Transaction ledger · 68 records', caseId: 'MULTI-CASE', timestamp: '01–25 Aug 2026', excerpt: 'Synthetic transfers across seven linked accounts. Amounts remain neutral financial observations.', hash: '31f7ac20…813e', integrity: 'verified', size: '7.2 KB', status: 'processed', entities: 7, relationships: 29, addedBy: 'Ingestion service' },
  { id: 'transcripts', filename: 'hearing_transcripts.txt', type: 'TRANSCRIPT', title: 'Hearing transcripts · 2 hearings', caseId: 'CASE-1004', timestamp: '20 Aug 2026', excerpt: 'Transcript-derived mentions and events for Cafe Meridian and Blue Arc Office.', hash: 'e3817b09…6c42', integrity: 'verified', size: '1.4 KB', status: 'processed', entities: 5, relationships: 5, addedBy: 'Forensic analyst' },
]

export const relationships: Relationship[] = [
  { id: 'P001-P002', source: 'P001', target: 'P002', type: 'MET', status: 'observed', confidence: 0.84, evidence: ['FIR-1001', 'SURV-0001'], timestamp: '12 Aug 2026' },
  { id: 'P001-P003', source: 'P001', target: 'P003', type: 'ASSOCIATED_WITH', status: 'corroborated', confidence: 0.91, evidence: ['FIR-1001', 'CDR', 'SURV-0003'], timestamp: '12–20 Aug 2026' },
  { id: 'P002-P003', source: 'P002', target: 'P003', type: 'ASSOCIATED_WITH', status: 'corroborated', confidence: 0.87, evidence: ['FIR-1002', 'CDR', 'SURV-0006'], timestamp: '15 Aug 2026' },
  { id: 'P003-P004', source: 'P003', target: 'P004', type: 'ASSOCIATED_WITH', status: 'corroborated', confidence: 0.89, evidence: ['FIR-1003', 'CDR', 'SURV-0009', 'AUDIO-001'], timestamp: '18–20 Aug 2026' },
  { id: 'P001-P004', source: 'P001', target: 'P004', type: 'ASSOCIATED_WITH', status: 'corroborated', confidence: 0.86, evidence: ['FIR-1004', 'SURV-0012', 'AUDIO-001'], timestamp: '20 Aug 2026' },
  { id: 'P003-P005', source: 'P003', target: 'P005', type: 'ASSOCIATED_WITH', status: 'corroborated', confidence: 0.82, evidence: ['FIR-1002', 'CDR', 'SURV-0006', 'TXN-0002'], timestamp: '15–16 Aug 2026' },
  { id: 'P004-P005', source: 'P004', target: 'P005', type: 'FINANCIAL_ASSOCIATION', status: 'observed', confidence: 0.78, evidence: ['TXN-0004'], timestamp: '18 Aug 2026' },
  { id: 'P001-P005', source: 'P001', target: 'P005', type: 'POTENTIAL_ASSOCIATION', status: 'predicted', confidence: 0.74, evidence: [], timestamp: 'Derived · Aug 2026' },
]

export const cases = [
  { id: 'CASE-1004', title: 'Cafe Meridian Network Demonstration', status: 'ACTIVE', priority: 'HIGH', jurisdiction: 'Delhi / Noida', evidence: 8, updated: '12 min ago' },
  { id: 'CASE-1003', title: 'Old Industrial Road financial trail', status: 'ACTIVE', priority: 'MEDIUM', jurisdiction: 'Ghaziabad', evidence: 14, updated: 'Yesterday' },
  { id: 'CASE-1002', title: 'Blue Arc Office association review', status: 'REVIEW', priority: 'MEDIUM', jurisdiction: 'Noida', evidence: 11, updated: '2 days ago' },
  { id: 'CASE-1001', title: 'Warehouse 7 meeting correlation', status: 'ARCHIVED', priority: 'LOW', jurisdiction: 'Noida', evidence: 19, updated: '04 Aug 2026' },
]

export const timeline = [
  ['12 AUG', '20:15', 'Warehouse 7', 'Rahul Sharma arrives at L001', 'SURVEILLANCE'],
  ['12 AUG', '20:31', 'Warehouse 7', 'Vikram Malhotra observed in same location window', 'SURVEILLANCE'],
  ['15 AUG', '19:18', 'Blue Arc Office', 'Sameer, Imran and Vikram converge at L005', 'SURVEILLANCE'],
  ['16 AUG', '—', 'Financial network', 'INR 420,000 transferred A002 → A003', 'FINANCIAL'],
  ['18 AUG', '22:42', 'Old Industrial Road', 'Vikram and Rakesh observed together', 'SURVEILLANCE'],
  ['20 AUG', '17:32', 'Cafe Meridian', 'Primary incident window opens', 'INCIDENT'],
  ['20 AUG', '17:51', 'Cafe Meridian', 'Rakesh and vehicle observed at L003', 'SURVEILLANCE'],
  ['20 AUG', '—', 'Hearing', 'Transcript links Rakesh, Vikram and Rahul', 'TRANSCRIPT'],
]

export const leads = [
  { rank: '01', name: 'Vikram Malhotra', id: 'P003', label: 'Potential intermediary', score: '0.91', reason: 'Cross-case, cross-city and cross-community connectivity.', signals: ['5 cross-source relationships', 'Bridge across 2 clusters', 'Appears in CASE-1001, 1002, 1003, 1004'] },
  { rank: '02', name: 'Rahul Sharma', id: 'P001', label: 'High-connectivity entity', score: '0.84', reason: 'Strong direct evidence across FIR, CDR and surveillance.', signals: ['3 corroborated sources', 'Warehouse 7 + Cafe Meridian', 'Alias resolved: Raju'] },
  { rank: '03', name: 'Sameer Khan', id: 'P002', label: 'Repeated association', score: '0.78', reason: 'Repeated communication and co-location with multiple entities.', signals: ['CDR activity across 4 cases', 'Shared L001 and L005', 'Alias resolved: Sam'] },
]

export const patterns = [
  { title: 'Cross-community intermediary', severity: 'HIGH', color: 'orange', entity: 'P003 · Vikram Malhotra', detail: 'One entity connects the Warehouse 7, Blue Arc Office and Cafe Meridian relationship clusters.', evidence: '5 relationships · 4 case contexts' },
  { title: 'Location convergence', severity: 'MEDIUM', color: 'blue', entity: 'L003 · Cafe Meridian', detail: 'Three people and two linked vehicles appear in the same location window on 20 Aug.', evidence: 'SURV-0010 → SURV-0012 · 19 minutes' },
  { title: 'Transaction chain', severity: 'MEDIUM', color: 'purple', entity: 'A002 → A003 → A004 → A005', detail: 'Funds move through three linked accounts across consecutive dates.', evidence: 'INR 1.095M · 16–18 Aug' },
]

export function entityById(id: string) {
  return [...people, ...secondaryEntities].find((entity) => entity.id === id)
}

export type GraphNode = Entity & { degree?: number }
export type GraphEdge = Relationship & { sources?: string[] }

// Local fallback mirrors the Neo4j shape and deliberately includes different entity types.
// It is only used when the graph API is unavailable; the API is the primary source in the app.
export const graphNodes: GraphNode[] = [
  ...people,
  { id: 'PH001', type: 'PHONE', name: '9000000001', role: 'linked phone' },
  { id: 'PH002', type: 'PHONE', name: '9000000002', role: 'linked phone' },
  { id: 'PH003', type: 'PHONE', name: '9000000003', role: 'linked phone' },
  { id: 'PH004', type: 'PHONE', name: '9000000004', role: 'linked phone' },
  { id: 'PH005', type: 'PHONE', name: '9000000005', role: 'linked phone' },
  { id: 'V001', type: 'VEHICLE', name: 'White SUV · DL01AB1234', role: 'registered to P001' },
  { id: 'V003', type: 'VEHICLE', name: 'Grey Hatchback · DL8CAF4455', role: 'registered to P003' },
  { id: 'V004', type: 'VEHICLE', name: 'White Van · UP14EF9090', role: 'registered to P004' },
  { id: 'A002', type: 'BANK_ACCOUNT', name: 'Sunrise Exports', role: 'linked account' },
  { id: 'A003', type: 'BANK_ACCOUNT', name: 'V-Metro Services', role: 'linked account' },
  { id: 'A004', type: 'BANK_ACCOUNT', name: 'R.Y. Enterprises', role: 'linked account' },
  { id: 'A005', type: 'BANK_ACCOUNT', name: 'Blue Arc Traders', role: 'linked account' },
  { id: 'L001', type: 'LOCATION', name: 'Warehouse 7', jurisdiction: 'Noida' },
  { id: 'L003', type: 'LOCATION', name: 'Cafe Meridian', jurisdiction: 'Delhi' },
  { id: 'L004', type: 'LOCATION', name: 'Old Industrial Road', jurisdiction: 'Ghaziabad' },
  { id: 'L005', type: 'LOCATION', name: 'Blue Arc Office', jurisdiction: 'Noida' },
]

const link = (id: string, source: string, target: string, type: string, status: RelationshipStatus = 'observed'): GraphEdge => ({ id, source, target, type, status, confidence: status === 'corroborated' ? 0.87 : 0.8, evidence: [] })
export const graphEdges: GraphEdge[] = [
  ...relationships.map((edge) => ({ ...edge, sources: edge.evidence })),
  link('P001-PH001', 'P001', 'PH001', 'USES'), link('P002-PH002', 'P002', 'PH002', 'USES'), link('P003-PH003', 'P003', 'PH003', 'USES'), link('P004-PH004', 'P004', 'PH004', 'USES'), link('P005-PH005', 'P005', 'PH005', 'USES'),
  link('P001-V001', 'P001', 'V001', 'OWNS'), link('P003-V003', 'P003', 'V003', 'OWNS'), link('P004-V004', 'P004', 'V004', 'OWNS'),
  link('P002-A002', 'P002', 'A002', 'CONTROLS'), link('P003-A003', 'P003', 'A003', 'CONTROLS'), link('P004-A004', 'P004', 'A004', 'CONTROLS'), link('P005-A005', 'P005', 'A005', 'CONTROLS'),
  link('P001-L001', 'P001', 'L001', 'VISITED'), link('P002-L001', 'P002', 'L001', 'VISITED'), link('P003-L001', 'P003', 'L001', 'VISITED'), link('P003-L003', 'P003', 'L003', 'VISITED'), link('P001-L003', 'P001', 'L003', 'VISITED'), link('P004-L003', 'P004', 'L003', 'VISITED'), link('P002-L005', 'P002', 'L005', 'VISITED'), link('P003-L005', 'P003', 'L005', 'VISITED'), link('P005-L005', 'P005', 'L005', 'VISITED'), link('P003-L004', 'P003', 'L004', 'VISITED'), link('P004-L004', 'P004', 'L004', 'VISITED'),
  link('A002-A003', 'A002', 'A003', 'TRANSFERRED_TO'), link('A003-A004', 'A003', 'A004', 'TRANSFERRED_TO'), link('A004-A005', 'A004', 'A005', 'TRANSFERRED_TO'), link('A003-A005', 'A003', 'A005', 'TRANSFERRED_TO'),
  link('PH001-PH002', 'PH001', 'PH002', 'CALLS', 'corroborated'), link('PH002-PH003', 'PH002', 'PH003', 'CALLS', 'corroborated'), link('PH003-PH004', 'PH003', 'PH004', 'CALLS', 'corroborated'), link('PH003-PH005', 'PH003', 'PH005', 'CALLS', 'corroborated'), link('PH001-PH003', 'PH001', 'PH003', 'CALLS', 'corroborated'), link('PH005-PH008', 'PH005', 'PH008', 'CALLS'), link('PH006-PH009', 'PH006', 'PH009', 'CALLS'), link('PH007-PH010', 'PH007', 'PH010', 'CALLS'),
]
