export const ENTITY_TYPES = ['PERSON', 'PHONE', 'VEHICLE', 'BANK_ACCOUNT', 'LOCATION', 'ORGANIZATION', 'CASE'] as const
export type OntologyEntityType = typeof ENTITY_TYPES[number]

export const RELATIONSHIP_TYPES = ['CALLS', 'MET', 'USES', 'OWNS', 'CONTROLS', 'TRANSFERRED_TO', 'VISITED', 'MEMBER_OF', 'ASSOCIATED_WITH', 'POTENTIAL_ASSOCIATION', 'MENTIONED_TOGETHER'] as const
export type OntologyRelationshipType = typeof RELATIONSHIP_TYPES[number]

const validPairs: Record<OntologyRelationshipType, readonly [OntologyEntityType, OntologyEntityType][]> = {
  CALLS: [['PERSON', 'PERSON'], ['PHONE', 'PHONE']],
  MET: [['PERSON', 'PERSON']],
  USES: [['PERSON', 'PHONE']],
  OWNS: [['PERSON', 'VEHICLE']],
  CONTROLS: [['PERSON', 'BANK_ACCOUNT']],
  TRANSFERRED_TO: [['BANK_ACCOUNT', 'BANK_ACCOUNT']],
  VISITED: [['PERSON', 'LOCATION']],
  MEMBER_OF: [['PERSON', 'ORGANIZATION']],
  ASSOCIATED_WITH: [['PERSON', 'PERSON']],
  POTENTIAL_ASSOCIATION: [['PERSON', 'PERSON']],
  MENTIONED_TOGETHER: [['PERSON', 'PERSON'], ['PERSON', 'PHONE'], ['PHONE', 'PHONE'], ['PERSON', 'LOCATION'], ['PERSON', 'ORGANIZATION']],
}

export function validateRelationship(input: { type: string; sourceType: string; targetType: string }) {
  const pairs = validPairs[input.type as OntologyRelationshipType]
  const valid = Boolean(pairs?.some(([source, target]) => source === input.sourceType && target === input.targetType))
  if (!valid) console.warn(`Ontology rejected relationship ${input.type}: ${input.sourceType} -> ${input.targetType}`)
  return valid
}

export function entityTypeFromId(id: string): OntologyEntityType {
  if (id.startsWith('P')) return 'PERSON'
  if (id.startsWith('PH')) return 'PHONE'
  if (id.startsWith('V')) return 'VEHICLE'
  if (id.startsWith('A')) return 'BANK_ACCOUNT'
  if (id.startsWith('L')) return 'LOCATION'
  if (id.startsWith('O')) return 'ORGANIZATION'
  if (id.startsWith('CASE-')) return 'CASE'
  return 'PERSON'
}
