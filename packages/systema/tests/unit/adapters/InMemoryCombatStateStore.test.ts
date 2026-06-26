import { describe, it, expect } from 'vitest'
import { InMemoryCombatStateStore } from '../../../src/adapters/in-memory/InMemoryCombatStateStore.js'
import { makePendingDecisionPayload, makeCombatSnapshot } from '../helpers/fixtures.js'

describe('InMemoryCombatStateStore', () => {
  describe('writePending / readPending', () => {
    it('returns undefined for unknown sequenceId', () => {
      const store = new InMemoryCombatStateStore()
      expect(store.readPending('seq-unknown')).toBeUndefined()
    })

    it('stores and retrieves a pending payload', async () => {
      const store = new InMemoryCombatStateStore()
      const payload = makePendingDecisionPayload()
      await store.writePending('seq-1', payload)
      expect(store.readPending('seq-1')).toEqual(payload)
    })

    it('overwrites existing entry on second write', async () => {
      const store = new InMemoryCombatStateStore()
      const p1 = makePendingDecisionPayload({ sequenceId: 'seq-1', stepId: 'step-1' })
      const p2 = makePendingDecisionPayload({ sequenceId: 'seq-1', stepId: 'step-2' })
      await store.writePending('seq-1', p1)
      await store.writePending('seq-1', p2)
      expect(store.readPending('seq-1')?.stepId).toBe('step-2')
    })
  })

  describe('clearPending', () => {
    it('removes the pending entry', async () => {
      const store = new InMemoryCombatStateStore()
      const payload = makePendingDecisionPayload()
      await store.writePending('seq-1', payload)
      await store.clearPending('seq-1')
      expect(store.readPending('seq-1')).toBeUndefined()
    })

    it('does not throw when clearing unknown sequenceId', async () => {
      const store = new InMemoryCombatStateStore()
      await expect(store.clearPending('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('readAllPending', () => {
    it('returns empty array when no pending entries', () => {
      const store = new InMemoryCombatStateStore()
      expect(store.readAllPending()).toEqual([])
    })

    it('returns all pending entries', async () => {
      const store = new InMemoryCombatStateStore()
      const p1 = makePendingDecisionPayload({ sequenceId: 'seq-1' })
      const p2 = makePendingDecisionPayload({ sequenceId: 'seq-2' })
      await store.writePending('seq-1', p1)
      await store.writePending('seq-2', p2)
      const all = store.readAllPending()
      expect(all).toHaveLength(2)
    })

    it('does not include cleared entries', async () => {
      const store = new InMemoryCombatStateStore()
      const p1 = makePendingDecisionPayload({ sequenceId: 'seq-1' })
      const p2 = makePendingDecisionPayload({ sequenceId: 'seq-2' })
      await store.writePending('seq-1', p1)
      await store.writePending('seq-2', p2)
      await store.clearPending('seq-1')
      const all = store.readAllPending()
      expect(all).toHaveLength(1)
      expect(all[0]?.sequenceId).toBe('seq-2')
    })
  })

  describe('seedCombat / getCurrentCombat', () => {
    it('returns null when no combat seeded', () => {
      const store = new InMemoryCombatStateStore()
      expect(store.getCurrentCombat()).toBeNull()
    })

    it('returns seeded combat snapshot', () => {
      const store = new InMemoryCombatStateStore()
      const combat = makeCombatSnapshot()
      store.seedCombat(combat)
      expect(store.getCurrentCombat()).toEqual(combat)
    })

    it('returns null after seeding null combat', () => {
      const store = new InMemoryCombatStateStore()
      store.seedCombat(makeCombatSnapshot())
      store.seedCombat(null)
      expect(store.getCurrentCombat()).toBeNull()
    })

    it('supports chaining seedCombat', () => {
      const store = new InMemoryCombatStateStore()
      const combat = makeCombatSnapshot({ round: 3 })
      const result = store.seedCombat(combat)
      expect(result).toBe(store)
    })
  })
})
