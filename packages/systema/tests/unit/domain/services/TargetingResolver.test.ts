import { describe, it, expect } from 'vitest'
import { TargetingResolver } from '../../../../src/domain/services/TargetingResolver.js'
import { InMemoryActorRepository } from '../../../../src/adapters/in-memory/InMemoryActorRepository.js'
import { StubTemplateManager } from '../../../../src/adapters/in-memory/StubTemplateManager.js'
import { StubTargetListener } from '../../../../src/adapters/in-memory/StubTargetListener.js'
import { StubExpressionEvaluator } from '../../../../src/adapters/in-memory/StubExpressionEvaluator.js'
import { makeActorSnapshot } from '../../helpers/fixtures.js'

function makeRepo() {
  const repo = new InMemoryActorRepository()
  repo.seed(makeActorSnapshot({ actorId: 'actor-1', tokenId: 'token-1' }))
  return repo
}

describe('TargetingResolver', () => {
  describe('none mode', () => {
    it('resolves to empty array immediately', async () => {
      const repo = makeRepo()
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, null)
      const result = await resolver.resolve({ mode: 'none', initiatorActorId: 'actor-1' })
      expect(result).toEqual([])
    })
  })

  describe('self mode', () => {
    it('resolves to initiator actor as single target', async () => {
      const repo = makeRepo()
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, null)
      const result = await resolver.resolve({ mode: 'self', initiatorActorId: 'actor-1' })
      expect(result).toHaveLength(1)
      expect(result[0]?.actorId).toBe('actor-1')
      expect(result[0]?.tokenId).toBe('token-1')
    })

    it('uses actorId as tokenId when tokenId is null', async () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ actorId: 'actor-2', tokenId: null }))
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, null)
      const result = await resolver.resolve({ mode: 'self', initiatorActorId: 'actor-2' })
      expect(result[0]?.tokenId).toBe('actor-2')
    })

    it('throws when initiator actor not found', async () => {
      const repo = new InMemoryActorRepository()
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, null)
      await expect(resolver.resolve({ mode: 'self', initiatorActorId: 'missing' })).rejects.toThrow()
    })
  })

  describe('token mode', () => {
    it('returns empty array when listener is null', async () => {
      const repo = makeRepo()
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, null)
      const result = await resolver.resolve({ mode: 'token', initiatorActorId: 'actor-1' })
      expect(result).toEqual([])
    })

    it('resolves selected token ids to ResolvedTarget[]', async () => {
      const repo = new InMemoryActorRepository()
      const snap1 = makeActorSnapshot({ actorId: 'actor-a', tokenId: 'tok-a' })
      const snap2 = makeActorSnapshot({ actorId: 'actor-b', tokenId: 'tok-b' })
      repo.seed(snap1).seed(snap2)
      repo.seedTokenMapping('tok-a', 'actor-a').seedTokenMapping('tok-b', 'actor-b')

      const listener = new StubTargetListener().setTokenIds(['tok-a', 'tok-b'])
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, listener)
      const result = await resolver.resolve({ mode: 'token', initiatorActorId: 'actor-a' })

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.tokenId)).toContain('tok-a')
      expect(result.map((r) => r.tokenId)).toContain('tok-b')
    })

    it('applies filter to token results when evaluator is provided', async () => {
      const repo = new InMemoryActorRepository()
      const snap1 = makeActorSnapshot({ actorId: 'actor-a', tokenId: 'tok-a', system: { hp: 5 } })
      const snap2 = makeActorSnapshot({ actorId: 'actor-b', tokenId: 'tok-b', system: { hp: 0 } })
      repo.seed(snap1).seed(snap2)
      repo.seedTokenMapping('tok-a', 'actor-a').seedTokenMapping('tok-b', 'actor-b')

      const evaluator = new StubExpressionEvaluator()
      evaluator.setResult('alive', true)
      // Filter that passes only tok-a
      const listener = new StubTargetListener().setTokenIds(['tok-a', 'tok-b'])

      // Use the inline evaluator — the filter '@actor.hp > 0' resolves via ConditionEvaluator logic
      // Here use the StubExpressionEvaluator which returns true for unknown expressions
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), evaluator, listener)
      const result = await resolver.resolve({ mode: 'token', initiatorActorId: 'actor-a', filter: 'alive' })
      // 'alive' maps to true in stub, so both pass
      expect(result).toHaveLength(2)
    })

    it('filter removes candidates that evaluate to false', async () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ actorId: 'actor-a', tokenId: 'tok-a' }))
      repo.seedTokenMapping('tok-a', 'actor-a')

      const evaluator = new StubExpressionEvaluator()
      evaluator.setResult('dead-check', false)
      const listener = new StubTargetListener().setTokenIds(['tok-a'])
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), evaluator, listener)

      const result = await resolver.resolve({ mode: 'token', initiatorActorId: 'actor-a', filter: 'dead-check' })
      expect(result).toHaveLength(0)
    })

    it('skips tokens not found in repository', async () => {
      const repo = makeRepo()
      const listener = new StubTargetListener().setTokenIds(['tok-unknown'])
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, listener)
      const result = await resolver.resolve({ mode: 'token', initiatorActorId: 'actor-1' })
      expect(result).toHaveLength(0)
    })
  })

  describe('area mode', () => {
    it('returns empty array when templateSpec is absent', async () => {
      const repo = makeRepo()
      const resolver = new TargetingResolver(repo, new StubTemplateManager(), null, null)
      const result = await resolver.resolve({ mode: 'area', initiatorActorId: 'actor-1' })
      expect(result).toEqual([])
    })

    it('creates template, waits for placement, collects tokens, deletes template', async () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ actorId: 'actor-a', tokenId: 'tok-a' }))
      repo.seedTokenMapping('tok-a', 'actor-a')
      repo.seedTemplateTokens('tmpl-1', ['tok-a'])

      const tmgr = new StubTemplateManager().setNextId('tmpl-1')
      const resolver = new TargetingResolver(repo, tmgr, null, null)

      const result = await resolver.resolve({
        mode: 'area',
        initiatorActorId: 'actor-a',
        templateSpec: { type: 'circle', distance: 10 },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.actorId).toBe('actor-a')
      expect(tmgr.wasCreated('tmpl-1')).toBe(true)
      expect(tmgr.wasDeleted('tmpl-1')).toBe(true)
    })

    it('returns empty array when no tokens in template', async () => {
      const repo = makeRepo()
      repo.seedTemplateTokens('tmpl-1', [])
      const tmgr = new StubTemplateManager().setNextId('tmpl-1')
      const resolver = new TargetingResolver(repo, tmgr, null, null)
      const result = await resolver.resolve({
        mode: 'area',
        initiatorActorId: 'actor-1',
        templateSpec: { type: 'cone', distance: 6 },
      })
      expect(result).toEqual([])
    })
  })
})
