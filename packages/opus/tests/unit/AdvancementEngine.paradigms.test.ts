import { describe, it, expect } from 'vitest'
import { AdvancementEngine } from '../../src/domain/AdvancementEngine'
import { PrerequisiteEvaluator } from '../../src/domain/PrerequisiteEvaluator'
import { makeFormaWithAdvancement } from '../fixtures/forma'
import { makeCharacterBuild } from '../fixtures/build'
import type { CharacterBuild } from '../../src/domain/CharacterBuild'

function makeEngine(): AdvancementEngine {
  return new AdvancementEngine(new PrerequisiteEvaluator(null))
}

describe('AdvancementEngine — purchase paradigm state updates', () => {
  it('milestone purchase decrements advancementsRemaining', () => {
    const engine = makeEngine()
    const forma = makeFormaWithAdvancement('milestone')
    const build: CharacterBuild = {
      ...makeCharacterBuild(),
      paradigmState: { paradigm: 'milestone', milestonesGranted: 2, advancementsRemaining: 3 },
    }
    const updated = engine.purchase(forma, build, 'enhanced-strength')
    expect(updated.paradigmState).toEqual({
      paradigm: 'milestone', milestonesGranted: 2, advancementsRemaining: 2,
    })
  })

  it('resource purchase leaves paradigm state unchanged', () => {
    const engine = makeEngine()
    const forma = makeFormaWithAdvancement('resource')
    const build: CharacterBuild = {
      ...makeCharacterBuild(),
      paradigmState: { paradigm: 'resource', currency: 'Gold' },
    }
    const updated = engine.purchase(forma, build, 'enhanced-strength')
    expect(updated.paradigmState).toEqual({ paradigm: 'resource', currency: 'Gold' })
  })

  it('practice purchase leaves paradigm state unchanged', () => {
    const engine = makeEngine()
    const forma = makeFormaWithAdvancement('practice')
    const build: CharacterBuild = {
      ...makeCharacterBuild(),
      paradigmState: { paradigm: 'practice', practiceLog: { 'enhanced-strength': 2 } },
    }
    const updated = engine.purchase(forma, build, 'enhanced-strength')
    expect(updated.paradigmState).toEqual({
      paradigm: 'practice', practiceLog: { 'enhanced-strength': 2 },
    })
  })

  it('marks purchase increases spent by track cost', () => {
    const engine = makeEngine()
    const forma = makeFormaWithAdvancement('marks')
    const build: CharacterBuild = {
      ...makeCharacterBuild(),
      paradigmState: { paradigm: 'marks', currency: 'Marks', total: 20, spent: 0 },
    }
    const updated = engine.purchase(forma, build, 'enhanced-strength') // cost 10
    expect(updated.paradigmState).toEqual({
      paradigm: 'marks', currency: 'Marks', total: 20, spent: 10,
    })
  })

  it('session purchase decrements advancementsRemaining', () => {
    const engine = makeEngine()
    const forma = makeFormaWithAdvancement('session')
    const build: CharacterBuild = {
      ...makeCharacterBuild(),
      paradigmState: { paradigm: 'session', sessionsCompleted: 2, advancementsRemaining: 2 },
    }
    const updated = engine.purchase(forma, build, 'enhanced-strength')
    expect(updated.paradigmState).toEqual({
      paradigm: 'session', sessionsCompleted: 2, advancementsRemaining: 1,
    })
  })

  it('purchase adds advancement to advancements list', () => {
    const engine = makeEngine()
    const forma = makeFormaWithAdvancement('marks')
    const build: CharacterBuild = {
      ...makeCharacterBuild(),
      paradigmState: { paradigm: 'marks', currency: 'Marks', total: 30, spent: 0 },
    }
    const updated = engine.purchase(forma, build, 'quick-reflexes')
    expect(updated.advancements.some(a => a.id === 'quick-reflexes')).toBe(true)
    expect(updated.advancements.find(a => a.id === 'quick-reflexes')?.purchasedAt).toBe(0)
  })

  it('xp purchase with multiple buys accumulates spent correctly', () => {
    const engine = makeEngine()
    const forma = makeFormaWithAdvancement('xp')
    let build = makeCharacterBuild({
      paradigmState: { paradigm: 'xp', currency: 'XP', total: 100, spent: 0 },
    })
    build = engine.purchase(forma, build, 'enhanced-strength') // cost 10
    build = engine.purchase(forma, build, 'quick-reflexes')    // cost 15
    const state = build.paradigmState
    if (state.paradigm === 'xp') {
      expect(state.spent).toBe(25)
    }
  })
})
