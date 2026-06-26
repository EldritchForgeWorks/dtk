import { describe, it, expect } from 'vitest'
import { CorpusValidator } from '../../src/domain/services/CorpusValidator.js'
import { InMemoryExemplarSource } from '../../src/adapters/in-memory/InMemoryExemplarSource.js'
import {
  makeRuleExemplar,
  makeSequenceExemplar,
  makeActionExemplar,
  makeSpeciesExemplar,
  makeArchetypeExemplar,
  makeDisciplineExemplar,
} from '../fixtures/exemplar.js'

function toRaw(data: unknown, filePath = 'test.yaml') {
  return { filePath, data }
}

describe('CorpusValidator', () => {
  describe('Boundary', () => {
    it('valid Exemplar produces no errors', async () => {
      const source = new InMemoryExemplarSource([toRaw(makeRuleExemplar())])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('invalid Exemplar records field-level errors', async () => {
      const source = new InMemoryExemplarSource([
        toRaw({ id: 'rule-bad', kind: 'rule', slug: 'bad', name: 'Bad',
          pool: null, ritus: 'std', on_tier: {} }),
      ])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(false)
      const poolError = result.errors.find(e => e.field.startsWith('pool'))
      expect(poolError).toBeDefined()
      expect(poolError!.phase).toBe('schema')
    })

    it('all Exemplars validated before errors reported', async () => {
      const source = new InMemoryExemplarSource([
        toRaw({ id: 'a', kind: 'rule', slug: 'a', name: 'A', pool: null, ritus: 'x', on_tier: {} }),
        toRaw({ id: 'b', kind: 'rule', slug: 'b', name: 'B', pool: null, ritus: 'x', on_tier: {} }),
        toRaw({ id: 'c', kind: 'rule', slug: 'c', name: 'C', pool: null, ritus: 'x', on_tier: {} }),
      ])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      const ids = new Set(result.errors.map(e => e.exemplarId))
      expect(ids.size).toBe(3)
    })

    it('discipline with valid archetype parent passes', async () => {
      const archetype = makeArchetypeExemplar()
      const discipline = makeDisciplineExemplar({ parent: archetype.id })
      const source = new InMemoryExemplarSource([toRaw(archetype), toRaw(discipline)])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(true)
    })

    it('discipline with missing parent fails with message', async () => {
      const discipline = makeDisciplineExemplar({ parent: 'ghost-archetype' })
      const source = new InMemoryExemplarSource([toRaw(discipline)])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(false)
      const err = result.errors.find(e => e.field === 'parent')
      expect(err).toBeDefined()
      expect(err!.message).toContain('ghost-archetype')
      expect(err!.phase).toBe('cross-reference')
    })

    it('discipline with wrong-kind parent fails', async () => {
      const species = makeSpeciesExemplar()
      const discipline = makeDisciplineExemplar({ parent: species.id })
      const source = new InMemoryExemplarSource([toRaw(species), toRaw(discipline)])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(false)
      const err = result.errors.find(e => e.field === 'parent')
      expect(err).toBeDefined()
      expect(err!.message).toContain('archetype')
      expect(err!.phase).toBe('cross-reference')
    })

    it('action with valid sequence ref passes', async () => {
      const rule = makeRuleExemplar()
      const seq = makeSequenceExemplar({ steps: [{ id: 'step-1', rule: rule.id }] })
      const action = makeActionExemplar({ sequence: seq.id })
      const source = new InMemoryExemplarSource([toRaw(rule), toRaw(seq), toRaw(action)])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(true)
    })

    it('action with missing sequence ref fails', async () => {
      const action = makeActionExemplar({ sequence: 'nonexistent-seq' })
      const source = new InMemoryExemplarSource([toRaw(action)])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(false)
      const err = result.errors.find(e => e.field === 'sequence')
      expect(err).toBeDefined()
      expect(err!.phase).toBe('cross-reference')
    })

    it('unique ids pass', async () => {
      const source = new InMemoryExemplarSource([
        toRaw(makeRuleExemplar()),
        toRaw(makeSpeciesExemplar()),
      ])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(true)
      expect(result.errors.filter(e => e.phase === 'uniqueness')).toHaveLength(0)
    })

    it('duplicate id produces errors for all duplicates', async () => {
      const source = new InMemoryExemplarSource([
        toRaw(makeRuleExemplar({ id: 'shared-id' })),
        toRaw(makeSpeciesExemplar({ id: 'shared-id' })),
      ])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(false)
      const dupeErrors = result.errors.filter(e => e.phase === 'uniqueness')
      expect(dupeErrors).toHaveLength(2)
    })

    it('`ValidationResult` is JSON-serialisable', async () => {
      const source = new InMemoryExemplarSource([
        toRaw({ id: 'bad', kind: 'rule', pool: null }),
      ])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(() => JSON.stringify(result)).not.toThrow()
      const parsed = JSON.parse(JSON.stringify(result))
      expect(parsed).toHaveProperty('valid')
      expect(parsed).toHaveProperty('errors')
      expect(Array.isArray(parsed.errors)).toBe(true)
    })
  })

  describe('Scenario', () => {
    it('happy path: 3 valid Exemplars yield valid result and corpus contains all 3', async () => {
      const rule = makeRuleExemplar()
      const seq = makeSequenceExemplar({ steps: [{ id: 'step-1', rule: rule.id }] })
      const action = makeActionExemplar({ sequence: seq.id })
      const source = new InMemoryExemplarSource([toRaw(rule), toRaw(seq), toRaw(action)])
      const validator = new CorpusValidator()
      const { corpus, result } = await validator.validate(source)
      expect(result.valid).toBe(true)
      expect(corpus.size()).toBe(3)
    })

    it('empty source returns valid result with empty corpus', async () => {
      const source = new InMemoryExemplarSource([])
      const validator = new CorpusValidator()
      const { corpus, result } = await validator.validate(source)
      expect(result.valid).toBe(true)
      expect(corpus.size()).toBe(0)
    })

    it('schema errors carry phase: schema', async () => {
      const source = new InMemoryExemplarSource([toRaw({ kind: 'rule' })])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.errors.every(e => e.phase === 'schema')).toBe(true)
    })
  })

  describe('Failure', () => {
    it('source list() throwing propagates the error', async () => {
      const source = { list: () => Promise.reject(new Error('disk error')) }
      const validator = new CorpusValidator()
      await expect(validator.validate(source)).rejects.toThrow('disk error')
    })

    it('schema errors prevent cross-reference pass from running', async () => {
      // One invalid rule + one action with nonexistent sequence ref.
      // If cross-ref ran we would get a cross-reference error too.
      // Early-exit ensures only schema errors appear.
      const source = new InMemoryExemplarSource([
        toRaw({ id: 'rule-bad', kind: 'rule', slug: 'bad', name: 'Bad', pool: null }),
        toRaw(makeActionExemplar({ sequence: 'nonexistent' })),
      ])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.errors.some(e => e.phase === 'schema')).toBe(true)
      expect(result.errors.every(e => e.phase === 'schema')).toBe(true)
    })
  })

  describe('Combinatorial', () => {
    it('sequence step referencing non-existent rule id produces cross-reference error', async () => {
      const seq = makeSequenceExemplar({
        steps: [{ id: 'step-1', rule: 'nonexistent-rule' }],
      })
      const source = new InMemoryExemplarSource([toRaw(seq)])
      const validator = new CorpusValidator()
      const { result } = await validator.validate(source)
      expect(result.valid).toBe(false)
      const err = result.errors.find(e => e.field.includes('rule'))
      expect(err).toBeDefined()
      expect(err!.phase).toBe('cross-reference')
    })

    it('all valid Exemplar kinds are accepted in a mixed corpus', async () => {
      const archetype = makeArchetypeExemplar()
      const discipline = makeDisciplineExemplar({ parent: archetype.id })
      const rule = makeRuleExemplar()
      const seq = makeSequenceExemplar({ steps: [{ id: 'step-1', rule: rule.id }] })
      const action = makeActionExemplar({ sequence: seq.id })
      const species = makeSpeciesExemplar()
      const source = new InMemoryExemplarSource([
        toRaw(archetype), toRaw(discipline), toRaw(rule),
        toRaw(seq), toRaw(action), toRaw(species),
      ])
      const validator = new CorpusValidator()
      const { corpus, result } = await validator.validate(source)
      expect(result.valid).toBe(true)
      expect(corpus.size()).toBe(6)
    })

    it('valid corpus has valid:true; invalid corpus has valid:false', async () => {
      const valid = new InMemoryExemplarSource([toRaw(makeSpeciesExemplar())])
      const invalid = new InMemoryExemplarSource([toRaw({ kind: 'species', id: 'x' })])
      const validator = new CorpusValidator()
      const { result: r1 } = await validator.validate(valid)
      const { result: r2 } = await validator.validate(invalid)
      expect(r1.valid).toBe(true)
      expect(r2.valid).toBe(false)
    })
  })
})
