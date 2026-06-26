import { describe, it, expect } from 'vitest'
import { initialParadigmState, emptyBuild, serialise, deserialise } from '../../src/domain/CharacterBuild'
import type { AdvancementConfig } from '../../src/domain/Forma'

describe('CharacterBuild', () => {
  describe('initialParadigmState', () => {
    it('xp paradigm with explicit currency', () => {
      const config: AdvancementConfig = { paradigm: 'xp', currency: 'Karma', starting: 400, tracks: [] }
      expect(initialParadigmState(config)).toEqual({
        paradigm: 'xp', currency: 'Karma', total: 400, spent: 0,
      })
    })

    it('xp paradigm defaults currency to XP', () => {
      const config: AdvancementConfig = { paradigm: 'xp', starting: 100, tracks: [] }
      const state = initialParadigmState(config)
      expect(state).toEqual({ paradigm: 'xp', currency: 'XP', total: 100, spent: 0 })
    })

    it('milestone paradigm starts with zero grants and remaining', () => {
      const config: AdvancementConfig = { paradigm: 'milestone', per_milestone: 3, tracks: [] }
      expect(initialParadigmState(config)).toEqual({
        paradigm: 'milestone', milestonesGranted: 0, advancementsRemaining: 0,
      })
    })

    it('resource paradigm with explicit currency', () => {
      const config: AdvancementConfig = {
        paradigm: 'resource', resource: '@actor.system.wealth.gold', currency: 'Gold', tracks: [],
      }
      expect(initialParadigmState(config)).toEqual({ paradigm: 'resource', currency: 'Gold' })
    })

    it('resource paradigm defaults currency to Resource', () => {
      const config: AdvancementConfig = {
        paradigm: 'resource', resource: '@actor.system.wealth.gold', tracks: [],
      }
      expect(initialParadigmState(config)).toEqual({ paradigm: 'resource', currency: 'Resource' })
    })

    it('practice paradigm starts with empty practiceLog', () => {
      const config: AdvancementConfig = {
        paradigm: 'practice', check_at: 'session_end', check_expression: '@uses >= 1', tracks: [],
      }
      expect(initialParadigmState(config)).toEqual({ paradigm: 'practice', practiceLog: {} })
    })

    it('marks paradigm with explicit currency', () => {
      const config: AdvancementConfig = {
        paradigm: 'marks', marks_per_session: 2, currency: 'Marks', tracks: [],
      }
      expect(initialParadigmState(config)).toEqual({
        paradigm: 'marks', currency: 'Marks', total: 0, spent: 0,
      })
    })

    it('marks paradigm defaults currency to Marks', () => {
      const config: AdvancementConfig = { paradigm: 'marks', marks_per_session: 2, tracks: [] }
      expect(initialParadigmState(config)).toEqual({
        paradigm: 'marks', currency: 'Marks', total: 0, spent: 0,
      })
    })

    it('session paradigm starts with zero completed and remaining', () => {
      const config: AdvancementConfig = { paradigm: 'session', sessions_per_advance: 1, tracks: [] }
      expect(initialParadigmState(config)).toEqual({
        paradigm: 'session', sessionsCompleted: 0, advancementsRemaining: 0,
      })
    })
  })

  describe('emptyBuild', () => {
    it('creates an empty build for the given systemId', () => {
      const build = emptyBuild('my-system')
      expect(build.systemId).toBe('my-system')
      expect(build.steps).toEqual({})
      expect(build.advancements).toEqual([])
    })

    it('uses xp paradigm state with zero total', () => {
      const build = emptyBuild('sys')
      expect(build.paradigmState).toEqual({ paradigm: 'xp', currency: 'XP', total: 0, spent: 0 })
    })
  })

  describe('serialise / deserialise', () => {
    it('round-trip preserves all fields', () => {
      const build = emptyBuild('system-x')
      const json = serialise(build)
      expect(typeof json).toBe('string')
      const result = deserialise(json)
      expect(result).toEqual(build)
    })

    it('serialised JSON contains systemId', () => {
      const build = emptyBuild('roundtrip-system')
      const json = serialise(build)
      expect(json).toContain('roundtrip-system')
    })

    it('deserialise preserves paradigmState structure', () => {
      const build = emptyBuild('test')
      const result = deserialise(serialise(build))
      expect(result.paradigmState.paradigm).toBe('xp')
    })
  })
})
