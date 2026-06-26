import { describe, it, expect } from 'vitest'
import { ExemplarCompiler, type ModusOutputMapper } from '../../src/domain/services/ExemplarCompiler.js'
import { ExemplarCorpus } from '../../src/domain/entities/ExemplarCorpus.js'
import { InMemoryCompendiumTarget } from '../../src/adapters/in-memory/InMemoryCompendiumTarget.js'
import { InMemoryExemplarSource } from '../../src/adapters/in-memory/InMemoryExemplarSource.js'
import { CorpusValidator } from '../../src/domain/services/CorpusValidator.js'
import {
  makeRuleExemplar,
  makeSequenceExemplar,
  makeActionExemplar,
  makeSpeciesExemplar,
} from '../fixtures/exemplar.js'

const COMPILED_AT = '2024-01-01T00:00:00.000Z'

function toRaw(data: unknown, filePath = 'test.yaml') {
  return { filePath, data }
}

const ruleMapper: ModusOutputMapper = {
  packId: 'rules',
  documentType: 'RuleItem',
  kinds: ['rule'],
  fieldMap: { 'pool': 'pool', 'ritus': 'ritus' },
}

const speciesMapper: ModusOutputMapper = {
  packId: 'species',
  documentType: 'SpeciesItem',
  kinds: ['species'],
  fieldMap: { 'grants': 'grants' },
}

describe('ExemplarCompiler', () => {
  describe('Group 1', () => {
    it('compile halts on validation errors (no LevelDB write)', async () => {
      const source = new InMemoryExemplarSource([
        toRaw({ id: 'bad-rule', kind: 'rule', pool: null }),
      ])
      const validator = new CorpusValidator()
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)

      const { result, corpus } = await validator.validate(source)
      if (result.valid) {
        await compiler.compile(corpus, [ruleMapper], COMPILED_AT)
      }

      expect(result.valid).toBe(false)
      expect(target.written).toHaveLength(0)
    })

    it('compile writes after clean validation', async () => {
      const rule = makeRuleExemplar()
      const source = new InMemoryExemplarSource([toRaw(rule)])
      const validator = new CorpusValidator()
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)

      const { result, corpus } = await validator.validate(source)
      expect(result.valid).toBe(true)
      await compiler.compile(corpus, [ruleMapper], COMPILED_AT)

      expect(target.written.length).toBeGreaterThan(0)
      expect(target.entriesFor('rules')).toHaveLength(1)
    })

    it('compiled entry has correct type from kind', () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const entry = compiler.toCompiledEntry(makeRuleExemplar(), ruleMapper, COMPILED_AT)
      expect(entry.type).toBe('RuleItem')
    })

    it('compiled entry carries promptuarium flag', () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const rule = makeRuleExemplar()
      const entry = compiler.toCompiledEntry(rule, ruleMapper, COMPILED_AT)
      expect(entry.flags['dtk-promptuarium'].exemplarId).toBe(rule.id)
      expect(entry.flags['dtk-promptuarium'].exemplarKind).toBe('rule')
      expect(entry.flags['dtk-promptuarium'].compiledAt).toBe(COMPILED_AT)
    })

    it('one LevelDB database per Modus compendium declaration', async () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const corpus = new ExemplarCorpus()
      corpus.add(makeRuleExemplar())
      corpus.add(makeSpeciesExemplar())

      await compiler.compile(corpus, [ruleMapper, speciesMapper], COMPILED_AT)

      expect(target.written).toHaveLength(2)
      const packIds = target.written.map(w => w.packId)
      expect(packIds).toContain('rules')
      expect(packIds).toContain('species')
    })

    it('entries in correct pack by kind', async () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const rule = makeRuleExemplar()
      const species = makeSpeciesExemplar()
      const corpus = new ExemplarCorpus()
      corpus.add(rule)
      corpus.add(species)

      await compiler.compile(corpus, [ruleMapper, speciesMapper], COMPILED_AT)

      const ruleEntries = target.entriesFor('rules')
      const speciesEntries = target.entriesFor('species')
      expect(ruleEntries).toHaveLength(1)
      expect(ruleEntries[0].flags['dtk-promptuarium'].exemplarId).toBe(rule.id)
      expect(speciesEntries).toHaveLength(1)
      expect(speciesEntries[0].flags['dtk-promptuarium'].exemplarId).toBe(species.id)
    })

    it('second compile produces identical output', async () => {
      const corpus = new ExemplarCorpus()
      corpus.add(makeRuleExemplar())

      const target1 = new InMemoryCompendiumTarget()
      await new ExemplarCompiler(target1).compile(corpus, [ruleMapper], COMPILED_AT)

      const target2 = new InMemoryCompendiumTarget()
      await new ExemplarCompiler(target2).compile(corpus, [ruleMapper], COMPILED_AT)

      expect(target1.written).toEqual(target2.written)
    })
  })

  describe('Group 2', () => {
    it('empty corpus with a mapper writes an empty entry list', async () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const corpus = new ExemplarCorpus()

      await compiler.compile(corpus, [ruleMapper], COMPILED_AT)

      expect(target.written).toHaveLength(1)
      expect(target.written[0].entries).toHaveLength(0)
    })

    it('fieldMap produces correct dot-path values in system', () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const rule = makeRuleExemplar()
      const entry = compiler.toCompiledEntry(rule, ruleMapper, COMPILED_AT)

      const system = entry.system as Record<string, unknown>
      expect(system['pool']).toBe(rule.pool)
      expect(system['ritus']).toBe(rule.ritus)
    })

    it('name field is copied from Exemplar name', () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const rule = makeRuleExemplar({ name: 'Custom Name' })
      const entry = compiler.toCompiledEntry(rule, ruleMapper, COMPILED_AT)
      expect(entry.name).toBe('Custom Name')
    })
  })

  describe('Group 3', () => {
    it('_id is stable: same exemplar id always produces the same hash', () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const rule = makeRuleExemplar()
      const entry1 = compiler.toCompiledEntry(rule, ruleMapper, COMPILED_AT)
      const entry2 = compiler.toCompiledEntry(rule, ruleMapper, COMPILED_AT)
      expect(entry1._id).toBe(entry2._id)
    })

    it('_id is a 16-character hexadecimal string', () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const entry = compiler.toCompiledEntry(makeRuleExemplar(), ruleMapper, COMPILED_AT)
      expect(entry._id).toMatch(/^[0-9a-f]{16}$/)
    })

    it('different exemplar ids produce different _ids', () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const rule1 = makeRuleExemplar({ id: 'rule-one', slug: 'one' })
      const rule2 = makeRuleExemplar({ id: 'rule-two', slug: 'two' })
      const entry1 = compiler.toCompiledEntry(rule1, ruleMapper, COMPILED_AT)
      const entry2 = compiler.toCompiledEntry(rule2, ruleMapper, COMPILED_AT)
      expect(entry1._id).not.toBe(entry2._id)
    })
  })

  describe('Group 4', () => {
    it('target.write() throwing propagates from compile()', async () => {
      const failingTarget = {
        write: () => Promise.reject(new Error('write failed')),
      }
      const compiler = new ExemplarCompiler(failingTarget)
      const corpus = new ExemplarCorpus()
      corpus.add(makeRuleExemplar())

      await expect(
        compiler.compile(corpus, [ruleMapper], COMPILED_AT),
      ).rejects.toThrow('write failed')
    })

    it('Exemplar with no matching mapper is not written', async () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const corpus = new ExemplarCorpus()
      corpus.add(makeSequenceExemplar()) // no mapper for 'sequence'

      await compiler.compile(corpus, [ruleMapper], COMPILED_AT)

      expect(target.entriesFor('rules')).toHaveLength(0)
    })

    it('large mixed corpus routes entries to correct packs with no cross-contamination', async () => {
      const target = new InMemoryCompendiumTarget()
      const compiler = new ExemplarCompiler(target)
      const corpus = new ExemplarCorpus()
      corpus.add(makeRuleExemplar())
      corpus.add(makeRuleExemplar({ id: 'rule-2', slug: 'rule-2' }))
      corpus.add(makeSpeciesExemplar())
      corpus.add(makeActionExemplar()) // no mapper → ignored

      await compiler.compile(corpus, [ruleMapper, speciesMapper], COMPILED_AT)

      expect(target.entriesFor('rules')).toHaveLength(2)
      expect(target.entriesFor('species')).toHaveLength(1)
      // No rule ids in species pack or vice versa
      expect(
        target.entriesFor('species').every(e => e.flags['dtk-promptuarium'].exemplarKind === 'species'),
      ).toBe(true)
    })
  })
})
