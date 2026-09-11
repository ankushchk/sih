import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateMerkleProof, calculateMerkleRoot, hashValue } from '@/lib/integrity'
import { resolveEntities } from '@/lib/resources'

test('Merkle proof is stable for an odd number of leaves', () => {
  const leaves = ['one', 'two', 'three'].map(hashValue)
  const root = calculateMerkleRoot(leaves)
  const proof = calculateMerkleProof(leaves, 1)
  assert.ok(root)
  assert.equal(proof.length, 2)
  assert.equal(proof[0].side, 'left')
})

test('entity extraction creates relationships only within the same source segment', () => {
  const result = resolveEntities('Rahul Sharma met Vikram Malhotra.\nRakesh Yadav arrived later.', 'TEST-RESOURCE')
  assert.equal(result.extractions.length, 3)
  assert.equal(result.connections.length, 1)
  assert.equal(result.connections[0].type, 'MET')
  assert.equal(result.connections[0].reviewStatus, 'pending')
  assert.match(result.connections[0].evidenceExcerpt, /Rahul Sharma met Vikram Malhotra/)
})
