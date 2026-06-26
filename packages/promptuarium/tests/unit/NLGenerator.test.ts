import { describe, it, expect } from 'vitest'
import { NLGenerator, type DescriptionCache, CACHE_VERSION } from '../../src/domain/services/NLGenerator.js'
import { ExemplarCorpus } from '../../src/domain/entities/ExemplarCorpus.js'
import { StubCodexProvider } from '../../src/adapters/in-memory/StubCodexProvider.js'
import { StubLLMClient } from '../../src/adapters/in-memory/StubLLMClient.js'
import {
  makeRuleExemplar,
  makeSequenceExemplar,
  makeActionExemplar,
  makeSpeciesExemplar,
  makeDisciplineExemplar,
} from '../fixtures/exemplar.js'

function makeEmptyCache(): DescriptionCache {
  return { version: CACHE_VERSION, entries: {} }
}

describe('NLGenerator', () => {
  describe('Group 1', () => {
    it('missing description generated', async () => {
      const rule = makeRuleExemplar() // no description field
      const corpus = new ExemplarCorpus()
      corpus.add(rule)
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const results = await generator.generateAll(corpus, { useLlm: false })
      expect(results).toHaveLength(1)
      expect(results[0].exemplarId).toBe(rule.id)
      expect(results[0].text).toBeTruthy()
    })

    it('existing description not overwritten', async () => {
      const rule = makeRuleExemplar({ description: 'existing description' })
      const corpus = new ExemplarCorpus()
      corpus.add(rule)
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const results = await generator.generateAll(corpus, { useLlm: false })
      // Exemplar with existing description is skipped
      expect(results).toHaveLength(0)
    })

    it('existing description overwritten with --force', async () => {
      const rule = makeRuleExemplar({ description: 'existing description' })
      const corpus = new ExemplarCorpus()
      corpus.add(rule)
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const results = await generator.generateAll(corpus, { useLlm: false, force: true })
      expect(results).toHaveLength(1)
      expect(results[0].text).toBeTruthy()
    })

    it('known Codex slug resolves to display name', async () => {
      const rule = makeRuleExemplar({ pool: 'agility' })
      const codex = new StubCodexProvider({ agility: 'Agility' })
      const generator = new NLGenerator(codex, new StubLLMClient())
      const result = await generator.generate(rule, undefined, { useLlm: false })
      expect(result.text).toContain('Agility')
    })

    it('unknown slug falls back to slug value', async () => {
      const rule = makeRuleExemplar({ pool: 'arcane-power' })
      const codex = new StubCodexProvider({}) // no overrides
      const generator = new NLGenerator(codex, new StubLLMClient())
      const result = await generator.generate(rule, undefined, { useLlm: false })
      expect(result.text).toContain('arcane-power')
    })

    it('LLM polish called on first run', async () => {
      const rule = makeRuleExemplar()
      const llm = new StubLLMClient()
      const generator = new NLGenerator(new StubCodexProvider(), llm)
      const result = await generator.generate(rule, undefined, { useLlm: true })
      expect(llm.callCount).toBe(1)
      expect(result.polished).toBe(true)
      expect(result.cached).toBe(false)
    })

    it('cached result reused on unchanged Exemplar', async () => {
      const rule = makeRuleExemplar()
      const llm = new StubLLMClient()
      const generator = new NLGenerator(new StubCodexProvider(), llm)
      const cache = makeEmptyCache()

      await generator.generate(rule, cache, { useLlm: true })
      expect(llm.callCount).toBe(1)

      const result2 = await generator.generate(rule, cache, { useLlm: true })
      expect(result2.cached).toBe(true)
      expect(llm.callCount).toBe(1) // not called again
    })

    it('cache invalidated on content change', async () => {
      const rule1 = makeRuleExemplar({ pool: 'agility' })
      const rule2 = makeRuleExemplar({ pool: 'strength' }) // same id, different content
      const llm = new StubLLMClient()
      const generator = new NLGenerator(new StubCodexProvider(), llm)
      const cache = makeEmptyCache()

      await generator.generate(rule1, cache, { useLlm: true })
      expect(llm.callCount).toBe(1)

      const result2 = await generator.generate(rule2, cache, { useLlm: true })
      expect(result2.cached).toBe(false)
      expect(llm.callCount).toBe(2) // called again due to different content hash
    })

    it('source YAML updated: generate() returns non-empty text for write-back', async () => {
      const rule = makeRuleExemplar()
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const result = await generator.generate(rule, undefined, { useLlm: false })
      expect(result.text).toBeTruthy()
      expect(result.exemplarId).toBe(rule.id)
    })

    it('other YAML fields unchanged after write-back: generate() does not mutate the Exemplar', async () => {
      const rule = makeRuleExemplar()
      const originalName = rule.name
      const originalId = rule.id
      const originalPool = rule.pool
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      await generator.generate(rule, undefined, { useLlm: false })
      // Exemplar is immutable — none of its fields should change
      expect(rule.name).toBe(originalName)
      expect(rule.id).toBe(originalId)
      expect(rule.pool).toBe(originalPool)
    })
  })

  describe('Group 2', () => {
    it('sequence Exemplar generates text containing step count', async () => {
      const seq = makeSequenceExemplar()
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const result = await generator.generate(seq, undefined, { useLlm: false })
      expect(result.text).toContain('1 step')
      expect(result.text).toContain('rule-ranged-attack')
    })

    it('action Exemplar generates text containing the action name', async () => {
      const action = makeActionExemplar()
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const result = await generator.generate(action, undefined, { useLlm: false })
      expect(result.text).toContain('Shoot')
      expect(result.text).toContain('seq-full-attack')
    })

    it('rule Exemplar template includes pool and ritus', async () => {
      const rule = makeRuleExemplar()
      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const result = await generator.generate(rule, undefined, { useLlm: false })
      expect(result.text).toContain('agility') // pool
      expect(result.text).toContain('standard-roll') // ritus (no codex override)
    })
  })

  describe('Group 3', () => {
    it('LLM throwing propagates from generate()', async () => {
      const rule = makeRuleExemplar()
      const throwingLlm = {
        polish: () => Promise.reject(new Error('LLM down')),
      }
      const generator = new NLGenerator(new StubCodexProvider(), throwingLlm)
      await expect(
        generator.generate(rule, undefined, { useLlm: true }),
      ).rejects.toThrow('LLM down')
    })

    it('useLlm: false → LLM is never called', async () => {
      const rule = makeRuleExemplar()
      const llm = new StubLLMClient()
      const generator = new NLGenerator(new StubCodexProvider(), llm)
      const result = await generator.generate(rule, undefined, { useLlm: false })
      expect(llm.callCount).toBe(0)
      expect(result.polished).toBe(false)
    })

    it('force:true bypasses cache and regenerates text', async () => {
      const rule = makeRuleExemplar()
      const llm = new StubLLMClient()
      const generator = new NLGenerator(new StubCodexProvider(), llm)
      const cache = makeEmptyCache()

      await generator.generate(rule, cache, { useLlm: true })
      expect(llm.callCount).toBe(1)

      // Second call with force:true → cache ignored
      const result = await generator.generate(rule, cache, { useLlm: true, force: true })
      expect(result.cached).toBe(false)
      expect(llm.callCount).toBe(2)
    })
  })

  describe('Group 4', () => {
    it('generateAll: 2 rules + 1 sequence + 1 action → 4 results', async () => {
      const corpus = new ExemplarCorpus()
      corpus.add(makeRuleExemplar())
      corpus.add(makeRuleExemplar({ id: 'rule-2' }))
      corpus.add(makeSequenceExemplar())
      corpus.add(makeActionExemplar())

      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const results = await generator.generateAll(corpus, { useLlm: false })
      expect(results).toHaveLength(4)
    })

    it('generateAll excludes species and discipline Exemplars', async () => {
      const corpus = new ExemplarCorpus()
      corpus.add(makeSpeciesExemplar())
      corpus.add(makeDisciplineExemplar())

      const generator = new NLGenerator(new StubCodexProvider(), new StubLLMClient())
      const results = await generator.generateAll(corpus, { useLlm: false })
      expect(results).toHaveLength(0)
    })

    it('generateAll with useLlm:true calls LLM once per generable Exemplar', async () => {
      const corpus = new ExemplarCorpus()
      corpus.add(makeRuleExemplar())
      corpus.add(makeSequenceExemplar())
      corpus.add(makeActionExemplar())
      corpus.add(makeSpeciesExemplar()) // excluded — should not trigger LLM

      const llm = new StubLLMClient()
      const generator = new NLGenerator(new StubCodexProvider(), llm)
      await generator.generateAll(corpus, { useLlm: true })
      expect(llm.callCount).toBe(3) // rule + sequence + action only
    })

    it('cache passed to generateAll is shared across all generate() calls', async () => {
      const rule1 = makeRuleExemplar()
      const rule2 = makeRuleExemplar({ id: 'rule-2' })
      const corpus = new ExemplarCorpus()
      corpus.add(rule1)
      corpus.add(rule2)

      const llm = new StubLLMClient()
      const generator = new NLGenerator(new StubCodexProvider(), llm)
      const cache = makeEmptyCache()

      await generator.generateAll(corpus, { useLlm: true }, cache)
      expect(llm.callCount).toBe(2)

      // Second run with same cache → both should be cache hits
      const results = await generator.generateAll(corpus, { useLlm: true }, cache)
      expect(results.every(r => r.cached)).toBe(true)
      expect(llm.callCount).toBe(2) // unchanged
    })
  })
})
