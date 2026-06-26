import { describe, it, expect, beforeEach } from 'vitest'
import { OpusApi } from '../../src/adapters/foundry/OpusApi'
import { FormaRegistry } from '../../src/domain/FormaRegistry'
import { InMemoryActorBuildStore } from '../../src/adapters/in-memory/InMemoryActorBuildStore'
import { NullWizardRenderer } from '../../src/adapters/in-memory/NullWizardRenderer'
import { NullTrackerRenderer } from '../../src/adapters/in-memory/NullTrackerRenderer'
import { StubExemplarQuery } from '../../src/adapters/in-memory/StubExemplarQuery'
import { makeSimpleForma, makeFormaWithAdvancement } from '../fixtures/forma'
import { makeCharacterBuild } from '../fixtures/build'

function makeApi(store?: InMemoryActorBuildStore) {
  const registry = new FormaRegistry()
  const s = store ?? new InMemoryActorBuildStore()
  return {
    api: new OpusApi(registry, s, new StubExemplarQuery(), new NullWizardRenderer(), new NullTrackerRenderer()),
    registry,
    store: s,
  }
}

describe('OpusApi', () => {
  beforeEach(() => {
    ;(global as any).game = {
      user: { isGM: false },
      actors: { get: (_id: string) => null },
    }
  })

  describe('Boundary', () => {
    it('isReady starts as false', () => {
      const { api } = makeApi()
      expect(api.isReady).toBe(false)
    })

    it('getBuild returns null for actor with no flags property', () => {
      const { api } = makeApi()
      expect(api.getBuild({ id: 'x' })).toBeNull()
    })

    it('getBuild returns null for actor with empty flags', () => {
      const { api } = makeApi()
      expect(api.getBuild({ id: 'x', flags: {} })).toBeNull()
    })

    it('getBuild returns null when dtk-opus flag has no build key', () => {
      const { api } = makeApi()
      const actor = { id: 'x', flags: { 'dtk-opus': {} } }
      expect(api.getBuild(actor)).toBeNull()
    })
  })

  describe('Scenario', () => {
    it('registerForma delegates to FormaRegistry', () => {
      const { api, registry } = makeApi()
      const forma = makeSimpleForma()
      api.registerForma('sr5e', forma)
      expect(registry.get('sr5e')).toEqual(forma)
    })

    it('getBuild returns build from actor flags', () => {
      const { api } = makeApi()
      const build = makeCharacterBuild()
      const actor = { id: 'a1', flags: { 'dtk-opus': { build } } }
      expect(api.getBuild(actor)).toEqual(build)
    })

    it('getBuild returns null for malformed build missing required fields', () => {
      const { api } = makeApi()
      const actor = { id: 'a1', flags: { 'dtk-opus': { build: { broken: true } } } }
      expect(api.getBuild(actor)).toBeNull()
    })

    it('openCreationWizard resolves null via NullWizardRenderer', async () => {
      const { api } = makeApi()
      api.registerForma('test-system', makeSimpleForma())
      const result = await api.openCreationWizard({ id: 'a1' }, 'test-system')
      expect(result).toBeNull()
    })

    it('openAdvancementTracker calls renderer without throwing', async () => {
      const store = new InMemoryActorBuildStore()
      const build = makeCharacterBuild()
      await store.set('a1', build)
      const { api } = makeApi(store)
      api.registerForma('test-system', makeFormaWithAdvancement())
      expect(() => api.openAdvancementTracker({ id: 'a1' })).not.toThrow()
    })
  })

  describe('Failure', () => {
    it('openCreationWizard throws descriptive error for unregistered system', async () => {
      const { api } = makeApi()
      await expect(api.openCreationWizard({ id: 'a1' }, 'ghost-system')).rejects.toThrow(
        'dtk-opus'
      )
    })

    it('openAdvancementTracker throws for actor with no build', () => {
      const { api } = makeApi()
      expect(() => api.openAdvancementTracker({ id: 'a1' })).toThrow('dtk-opus')
    })

    it('openAdvancementTracker throws when Forma not found for build systemId', async () => {
      const store = new InMemoryActorBuildStore()
      const build = makeCharacterBuild({ systemId: 'unregistered' })
      await store.set('a1', build)
      const { api } = makeApi(store)
      expect(() => api.openAdvancementTracker({ id: 'a1' })).toThrow('dtk-opus')
    })

    it('triggerMilestone throws descriptive error for non-GM', () => {
      const { api } = makeApi()
      ;(global as any).game.user.isGM = false
      expect(() => api.triggerMilestone({ id: 'a1' })).toThrow('GM-only')
    })
  })

  describe('Combinatorial', () => {
    it('getBuild returns null for build flag that is not an object', () => {
      const { api } = makeApi()
      const actor = { id: 'a1', flags: { 'dtk-opus': { build: 'not-an-object' } } }
      expect(api.getBuild(actor)).toBeNull()
    })

    it('registerForma then openCreationWizard uses registered forma', async () => {
      const { api } = makeApi()
      const forma = makeSimpleForma({ systemId: 'test-system' })
      api.registerForma('test-system', forma)
      const result = await api.openCreationWizard({ id: 'a1' }, 'test-system')
      expect(result).toBeNull() // NullWizardRenderer returns null
    })

    it('getBuild validates all three required fields are present', () => {
      const { api } = makeApi()
      // Missing 'advancements'
      const actor = {
        id: 'a1',
        flags: { 'dtk-opus': { build: { systemId: 'x', steps: {} } } },
      }
      expect(api.getBuild(actor)).toBeNull()
    })
  })
})
