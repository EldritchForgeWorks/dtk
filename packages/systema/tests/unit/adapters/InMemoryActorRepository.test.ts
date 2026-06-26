import { describe, it, expect } from 'vitest'
import { InMemoryActorRepository } from '../../../src/adapters/in-memory/InMemoryActorRepository.js'
import { makeActorSnapshot } from '../helpers/fixtures.js'

describe('InMemoryActorRepository', () => {
  describe('seed / getSnapshot', () => {
    it('returns undefined for unknown actorId', () => {
      const repo = new InMemoryActorRepository()
      expect(repo.getSnapshot('nonexistent')).toBeUndefined()
    })

    it('returns seeded snapshot by actorId', () => {
      const repo = new InMemoryActorRepository()
      const snap = makeActorSnapshot({ actorId: 'a1' })
      repo.seed(snap)
      expect(repo.getSnapshot('a1')).toEqual(snap)
    })

    it('supports chaining: seed().seed()', () => {
      const repo = new InMemoryActorRepository()
      const s1 = makeActorSnapshot({ actorId: 'a1' })
      const s2 = makeActorSnapshot({ actorId: 'a2' })
      repo.seed(s1).seed(s2)
      expect(repo.getSnapshot('a1')).toEqual(s1)
      expect(repo.getSnapshot('a2')).toEqual(s2)
    })

    it('overwrites snapshot on duplicate seed', () => {
      const repo = new InMemoryActorRepository()
      const s1 = makeActorSnapshot({ actorId: 'a1', name: 'Old' })
      const s2 = makeActorSnapshot({ actorId: 'a1', name: 'New' })
      repo.seed(s1).seed(s2)
      expect(repo.getSnapshot('a1')?.name).toBe('New')
    })
  })

  describe('seedTokenMapping / getTokenSnapshot', () => {
    it('returns undefined for unknown tokenId', () => {
      const repo = new InMemoryActorRepository()
      expect(repo.getTokenSnapshot('tok-unknown')).toBeUndefined()
    })

    it('returns actor snapshot via token mapping', () => {
      const repo = new InMemoryActorRepository()
      const snap = makeActorSnapshot({ actorId: 'a1' })
      repo.seed(snap).seedTokenMapping('tok-1', 'a1')
      expect(repo.getTokenSnapshot('tok-1')).toEqual(snap)
    })

    it('returns undefined when token maps to unseeded actor', () => {
      const repo = new InMemoryActorRepository()
      repo.seedTokenMapping('tok-1', 'ghost-actor')
      expect(repo.getTokenSnapshot('tok-1')).toBeUndefined()
    })
  })

  describe('seedTemplateTokens / getTokenIdsInTemplate', () => {
    it('returns empty array for unknown template', () => {
      const repo = new InMemoryActorRepository()
      expect(repo.getTokenIdsInTemplate('tmpl-unknown')).toEqual([])
    })

    it('returns seeded token ids for template', () => {
      const repo = new InMemoryActorRepository()
      repo.seedTemplateTokens('tmpl-1', ['tok-a', 'tok-b'])
      expect(repo.getTokenIdsInTemplate('tmpl-1')).toEqual(['tok-a', 'tok-b'])
    })

    it('returns empty array when seeded with empty list', () => {
      const repo = new InMemoryActorRepository()
      repo.seedTemplateTokens('tmpl-1', [])
      expect(repo.getTokenIdsInTemplate('tmpl-1')).toEqual([])
    })
  })

  describe('seedOwned / isOwnedByCurrentUser', () => {
    it('returns false when actor not seeded as owned', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ actorId: 'a1' }))
      expect(repo.isOwnedByCurrentUser('a1')).toBe(false)
    })

    it('returns true when actor is seeded as owned', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ actorId: 'a1' })).seedOwned('a1')
      expect(repo.isOwnedByCurrentUser('a1')).toBe(true)
    })

    it('only marks the seeded actor as owned (not others)', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ actorId: 'a1' }))
        .seed(makeActorSnapshot({ actorId: 'a2' }))
        .seedOwned('a1')
      expect(repo.isOwnedByCurrentUser('a1')).toBe(true)
      expect(repo.isOwnedByCurrentUser('a2')).toBe(false)
    })
  })
})
