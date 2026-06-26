import { describe, it, expect } from 'vitest'
import { AdvancementEngine } from '../../src/domain/AdvancementEngine'
import { PrerequisiteEvaluator } from '../../src/domain/PrerequisiteEvaluator'
import { makeFormaWithAdvancement } from '../fixtures/forma'
import { makeCharacterBuild, makeBuildWithAdvancements } from '../fixtures/build'
import type { CharacterBuild } from '../../src/domain/CharacterBuild'
import type { Forma } from '../../src/domain/Forma'

function makeEngine(): AdvancementEngine {
  return new AdvancementEngine(new PrerequisiteEvaluator(null))
}

describe('AdvancementEngine', () => {
  describe('Group 1', () => {
    it('canBuy with unknown advancementId throws', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const build = makeCharacterBuild()
      expect(() => engine.canBuy(forma, build, 'nonexistent-id')).toThrow()
    })

    it('purchase returns a new object not the same reference', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const build = makeCharacterBuild()
      const updated = engine.purchase(forma, build, 'enhanced-strength')
      expect(updated).not.toBe(build)
      expect(updated.advancements).not.toBe(build.advancements)
    })

    it('availableAdvancements with empty tracks returns empty array', () => {
      const engine = makeEngine()
      const forma: Forma = {
        systemId: 'test',
        steps: [],
        advancement: { paradigm: 'xp', currency: 'XP', starting: 100, tracks: [] },
      }
      const build = makeCharacterBuild()
      expect(engine.availableAdvancements(forma, build)).toEqual([])
    })
  })

  describe('Group 2', () => {
    it('xp paradigm: sufficient pool opens gate; insufficient closes it', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const richBuild = makeCharacterBuild()
      expect(engine.canBuy(forma, richBuild, 'enhanced-strength')).toBe(true)

      const poorBuild = makeCharacterBuild({
        paradigmState: { paradigm: 'xp', currency: 'XP', total: 10, spent: 5 },
      })
      expect(engine.canBuy(forma, poorBuild, 'quick-reflexes')).toBe(false)
    })

    it('milestone paradigm: advancementsRemaining > 0 opens gate; = 0 closes it', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('milestone')
      const buildWithSlots: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'milestone', milestonesGranted: 1, advancementsRemaining: 2 },
      }
      expect(engine.canBuy(forma, buildWithSlots, 'enhanced-strength')).toBe(true)

      const buildNoSlots: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'milestone', milestonesGranted: 1, advancementsRemaining: 0 },
      }
      expect(engine.canBuy(forma, buildNoSlots, 'enhanced-strength')).toBe(false)
    })

    it('resource paradigm: gate is always open at domain level', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('resource')
      const build: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'resource', currency: 'Gold' },
      }
      expect(engine.canBuy(forma, build, 'enhanced-strength')).toBe(true)
    })

    it('practice paradigm: practiceLog count meeting check_expression opens gate', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('practice')
      const buildWithLog: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'practice', practiceLog: { 'enhanced-strength': 2 } },
      }
      expect(engine.canBuy(forma, buildWithLog, 'enhanced-strength')).toBe(true)

      const buildEmptyLog: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'practice', practiceLog: {} },
      }
      expect(engine.canBuy(forma, buildEmptyLog, 'enhanced-strength')).toBe(false)
    })

    it('marks paradigm: unspent marks >= cost opens gate; below cost closes it', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('marks')
      const richBuild: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'marks', currency: 'Marks', total: 20, spent: 0 },
      }
      expect(engine.canBuy(forma, richBuild, 'enhanced-strength')).toBe(true)

      const poorBuild: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'marks', currency: 'Marks', total: 5, spent: 0 },
      }
      expect(engine.canBuy(forma, poorBuild, 'enhanced-strength')).toBe(false)
    })

    it('session paradigm: advancementsRemaining > 0 opens gate; = 0 closes it', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('session')
      const buildWithSlots: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'session', sessionsCompleted: 1, advancementsRemaining: 1 },
      }
      expect(engine.canBuy(forma, buildWithSlots, 'enhanced-strength')).toBe(true)

      const buildNoSlots: CharacterBuild = {
        ...makeCharacterBuild(),
        paradigmState: { paradigm: 'session', sessionsCompleted: 1, advancementsRemaining: 0 },
      }
      expect(engine.canBuy(forma, buildNoSlots, 'enhanced-strength')).toBe(false)
    })

    it('purchased advancement is shown as purchased not available', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const build = makeBuildWithAdvancements(['enhanced-strength'])
      const entries = engine.availableAdvancements(forma, build)
      const entry = entries.find(e => e.id === 'enhanced-strength')!
      expect(entry.purchased).toBe(true)
      expect(entry.available).toBe(false)
    })

    it('buy is idempotent: already purchased advancement cannot be re-purchased', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const build = makeBuildWithAdvancements(['enhanced-strength'])
      expect(engine.canBuy(forma, build, 'enhanced-strength')).toBe(false)
    })
  })

  describe('Group 3', () => {
    it('advancement locked by unlock_after step not in build is unavailable', () => {
      const engine = makeEngine()
      const forma: Forma = {
        ...makeFormaWithAdvancement('xp'),
        advancement: {
          paradigm: 'xp',
          currency: 'XP',
          starting: 100,
          tracks: [{ id: 'locked-adv', title: 'Locked', cost: 5, unlock_after: 'archetype' }],
        },
      }
      const buildNoArchetype: CharacterBuild = { ...makeCharacterBuild(), steps: {} }
      expect(engine.canBuy(forma, buildNoArchetype, 'locked-adv')).toBe(false)
      const entries = engine.availableAdvancements(forma, buildNoArchetype)
      expect(entries[0].unlocked).toBe(false)
      expect(entries[0].available).toBe(false)
    })

    it('failed prerequisite blocks buy and marks entry as not prerequisitesMet', () => {
      const engine = makeEngine()
      const forma: Forma = {
        ...makeFormaWithAdvancement('xp'),
        advancement: {
          paradigm: 'xp',
          currency: 'XP',
          starting: 100,
          tracks: [{ id: 'req-adv', title: 'Req', cost: 5, requires: "@steps.archetype.choice == 'face'" }],
        },
      }
      const build = makeCharacterBuild() // archetype = 'street-samurai', not 'face'
      expect(engine.canBuy(forma, build, 'req-adv')).toBe(false)
      const entries = engine.availableAdvancements(forma, build)
      expect(entries[0].prerequisitesMet).toBe(false)
    })

    it('purchase throws when gate condition not met', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const poorBuild = makeCharacterBuild({
        paradigmState: { paradigm: 'xp', currency: 'XP', total: 0, spent: 0 },
      })
      expect(() => engine.purchase(forma, poorBuild, 'enhanced-strength')).toThrow()
    })
  })

  describe('Group 4', () => {
    it('purchase updates xp paradigmState spent and leaves other fields unchanged', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const build = makeCharacterBuild({
        paradigmState: { paradigm: 'xp', currency: 'XP', total: 100, spent: 10 },
      })
      const updated = engine.purchase(forma, build, 'enhanced-strength') // cost 10
      expect(updated.paradigmState).toEqual({ paradigm: 'xp', currency: 'XP', total: 100, spent: 20 })
      expect(updated.systemId).toBe(build.systemId)
      expect(updated.steps).toEqual(build.steps)
    })

    it('availableAdvancements returns correct mix of purchased, available, and locked entries', () => {
      const engine = makeEngine()
      const forma: Forma = {
        ...makeFormaWithAdvancement('xp'),
        advancement: {
          paradigm: 'xp',
          currency: 'XP',
          starting: 100,
          tracks: [
            { id: 'bought', title: 'Bought', cost: 5 },
            { id: 'available', title: 'Available', cost: 5 },
            { id: 'locked', title: 'Locked', cost: 5, unlock_after: 'missing-step' },
          ],
        },
      }
      const build: CharacterBuild = {
        ...makeCharacterBuild(),
        advancements: [{ id: 'bought', purchasedAt: 0 }],
        paradigmState: { paradigm: 'xp', currency: 'XP', total: 100, spent: 5 },
      }
      const entries = engine.availableAdvancements(forma, build)
      const bought = entries.find(e => e.id === 'bought')!
      const avail = entries.find(e => e.id === 'available')!
      const locked = entries.find(e => e.id === 'locked')!
      expect(bought.purchased).toBe(true)
      expect(bought.available).toBe(false)
      expect(avail.available).toBe(true)
      expect(locked.unlocked).toBe(false)
      expect(locked.available).toBe(false)
    })

    it('purchase then canBuy same advancement returns false', () => {
      const engine = makeEngine()
      const forma = makeFormaWithAdvancement('xp')
      const build = makeCharacterBuild()
      const updated = engine.purchase(forma, build, 'enhanced-strength')
      expect(engine.canBuy(forma, updated, 'enhanced-strength')).toBe(false)
    })
  })
})
