import { describe, it, expect } from 'vitest'
import { ContextBuilder } from '../../../../src/domain/services/ContextBuilder.js'
import { InMemoryActorRepository } from '../../../../src/adapters/in-memory/InMemoryActorRepository.js'
import { InMemoryCombatStateStore } from '../../../../src/adapters/in-memory/InMemoryCombatStateStore.js'
import { makeActorSnapshot, makeResolvedTarget, makeCombatSnapshot } from '../../helpers/fixtures.js'
import { ContextBuildError } from '../../../../src/errors.js'

function makeBuilder(actorIds = ['actor-1']) {
  const repo = new InMemoryActorRepository()
  for (const id of actorIds) {
    repo.seed(makeActorSnapshot({ actorId: id, tokenId: `token-${id}` }))
  }
  const store = new InMemoryCombatStateStore()
  return { builder: new ContextBuilder(repo, store), repo, store }
}

describe('ContextBuilder', () => {
  describe('build', () => {
    it('builds a RollContext with all required fields', () => {
      const { builder } = makeBuilder()
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [],
        actionId: 'action-1',
        itemId: null,
      })
      expect(ctx.actionId).toBe('action-1')
      expect(ctx.itemId).toBeNull()
      expect(ctx.targets).toEqual([])
      expect(ctx.combat).toBeNull()
      expect(ctx.stepInputs).toEqual({})
    })

    it('includes initiator snapshot', () => {
      const { builder } = makeBuilder()
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [],
        actionId: 'action-1',
        itemId: null,
      })
      expect(ctx.initiator.actorId).toBe('actor-1')
    })

    it('includes targets when provided', () => {
      const { builder } = makeBuilder(['actor-1', 'actor-2'])
      const target = makeResolvedTarget({ actorId: 'actor-2', tokenId: 'token-actor-2' })
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [target],
        actionId: 'action-1',
        itemId: null,
      })
      expect(ctx.targets).toHaveLength(1)
      expect(ctx.targets[0]?.actorId).toBe('actor-2')
    })

    it('includes two targets with their system data', () => {
      const { builder } = makeBuilder(['actor-1'])
      const snap1 = makeActorSnapshot({ actorId: 't1', tokenId: 'tok1', system: { hp: 8 } })
      const snap2 = makeActorSnapshot({ actorId: 't2', tokenId: 'tok2', system: { hp: 3 } })
      const t1 = makeResolvedTarget({ actorId: 't1', tokenId: 'tok1', snapshot: snap1 })
      const t2 = makeResolvedTarget({ actorId: 't2', tokenId: 'tok2', snapshot: snap2 })
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [t1, t2],
        actionId: 'action-1',
        itemId: null,
      })
      expect(ctx.targets).toHaveLength(2)
      expect(ctx.targets[0]?.snapshot.system['hp']).toBe(8)
      expect(ctx.targets[1]?.snapshot.system['hp']).toBe(3)
    })

    it('includes combat snapshot when in combat', () => {
      const { builder, store } = makeBuilder()
      const combat = makeCombatSnapshot()
      store.seedCombat(combat)
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [],
        actionId: 'action-1',
        itemId: null,
      })
      expect(ctx.combat).toEqual(combat)
    })

    it('combat is null when not in combat', () => {
      const { builder } = makeBuilder()
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [],
        actionId: 'action-1',
        itemId: null,
      })
      expect(ctx.combat).toBeNull()
    })

    it('includes itemId when provided', () => {
      const { builder } = makeBuilder()
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [],
        actionId: 'action-1',
        itemId: 'item-42',
      })
      expect(ctx.itemId).toBe('item-42')
    })

    it('includes stepInputs when provided', () => {
      const { builder } = makeBuilder()
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [],
        actionId: 'action-1',
        itemId: null,
        stepInputs: { prevResult: 'hit' },
      })
      expect(ctx.stepInputs['prevResult']).toBe('hit')
    })

    it('defaults stepInputs to empty object when not provided', () => {
      const { builder } = makeBuilder()
      const ctx = builder.build({
        initiatorActorId: 'actor-1',
        targets: [],
        actionId: 'action-1',
        itemId: null,
      })
      expect(ctx.stepInputs).toEqual({})
    })

    it('throws ContextBuildError when initiator actor not found', () => {
      const repo = new InMemoryActorRepository()
      const store = new InMemoryCombatStateStore()
      const builder = new ContextBuilder(repo, store)
      expect(() => builder.build({
        initiatorActorId: 'missing',
        targets: [],
        actionId: 'action-1',
        itemId: null,
      })).toThrow(ContextBuildError)
    })

    it('ContextBuildError message identifies missing actor', () => {
      const repo = new InMemoryActorRepository()
      const store = new InMemoryCombatStateStore()
      const builder = new ContextBuilder(repo, store)
      expect(() => builder.build({
        initiatorActorId: 'ghost-actor',
        targets: [],
        actionId: 'a1',
        itemId: null,
      })).toThrow(/ghost-actor/)
    })
  })
})
