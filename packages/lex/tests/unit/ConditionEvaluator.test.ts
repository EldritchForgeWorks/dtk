import { describe, it, expect, vi } from 'vitest'
import { ConditionEvaluator } from '../../src/domain/ConditionEvaluator.js'
import { CodexRegistry } from '../../src/domain/CodexRegistry.js'
import { ExpressionEngine } from '../../src/domain/ExpressionEngine.js'
import { makeConditionEntry, makeSr5eCodex } from '../fixtures/codex.js'
import { makeSr5eActorContext } from '../fixtures/context.js'

describe('ConditionEvaluator', () => {
  function makeEvaluator() {
    const registry = new CodexRegistry()
    const engine = new ExpressionEngine()
    const evaluator = new ConditionEvaluator(registry, engine)
    return { evaluator, registry, engine }
  }

  describe('Group 1', () => {
    it('entry with condition field registered as evaluable', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [makeConditionEntry('flanked', '@combat.flanked == true')])
      expect(evaluator.isCondition('sr5e', 'flanked')).toBe(true)
    })

    it('entry without condition field not evaluable', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [{ slug: 'agility', displayName: 'Agility' }])
      expect(evaluator.isCondition('sr5e', 'agility')).toBe(false)
    })

    it('condition evaluates to true', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [makeConditionEntry('prone', '@actor.conditions.prone == true')])
      const ctx = { actor: { conditions: { prone: true } } } as any
      expect(evaluator.evaluate('sr5e', 'prone', ctx)).toBe(true)
    })

    it('condition evaluates to false', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [makeConditionEntry('prone', '@actor.conditions.prone == true')])
      const ctx = { actor: { conditions: { prone: false } } } as any
      expect(evaluator.evaluate('sr5e', 'prone', ctx)).toBe(false)
    })

    it('unknown condition returns false + warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', makeSr5eCodex())
      const result = evaluator.evaluate('sr5e', 'invisible', {})
      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invisible'))
      warnSpy.mockRestore()
    })

    it('null result treated as false + warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { evaluator, registry } = makeEvaluator()
      // 1 / 0 evaluates to null in the Interpreter
      registry.register('sr5e', [makeConditionEntry('nullcond', '1 / 0')])
      const result = evaluator.evaluate('sr5e', 'nullcond', {})
      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('batch evaluateAll returns all conditions', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [
        makeConditionEntry('prone', '@prone == true'),
        makeConditionEntry('flanked', '@flanked == true'),
        makeConditionEntry('outnumbered', '@outnumbered == true'),
      ])
      const ctx = { prone: false, flanked: true, outnumbered: false } as any
      const result = evaluator.evaluateAll('sr5e', ctx)
      expect(Object.keys(result)).toHaveLength(3)
      expect(result['flanked']).toBe(true)
      expect(result['prone']).toBe(false)
      expect(result['outnumbered']).toBe(false)
    })

    it("failed condition in batch doesn't abort", () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [
        makeConditionEntry('broken', '1 / 0'),
        makeConditionEntry('prone', '@prone == true'),
        makeConditionEntry('flanked', '@flanked == true'),
      ])
      const ctx = { prone: true, flanked: false } as any
      const result = evaluator.evaluateAll('sr5e', ctx)
      expect(result['broken']).toBe(false)
      expect(result['prone']).toBe(true)
      expect(result['flanked']).toBe(false)
      warnSpy.mockRestore()
    })

    it('context unchanged after evaluation', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [
        makeConditionEntry('prone', '@actor.conditions.prone == true'),
        makeConditionEntry('flanked', '@combat.flanked == true'),
      ])
      const ctx = { actor: { conditions: { prone: false } }, combat: { flanked: true } } as any
      const before = JSON.stringify(ctx)
      evaluator.evaluateAll('sr5e', ctx)
      expect(JSON.stringify(ctx)).toBe(before)
    })
  })

  describe('Group 2', () => {
    it('entry with empty condition string is not evaluable', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [{ slug: 'prone', displayName: 'Prone', condition: '' }])
      expect(evaluator.isCondition('sr5e', 'prone')).toBe(false)
    })

    it('evaluateAll on system with no condition entries returns empty object', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', makeSr5eCodex())
      expect(evaluator.evaluateAll('sr5e', {})).toEqual({})
    })

    it('evaluate entry without condition expression warns and returns false', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [{ slug: 'agility', displayName: 'Agility' }])
      const result = evaluator.evaluate('sr5e', 'agility', {})
      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('isCondition returns false for unknown slug', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', makeSr5eCodex())
      expect(evaluator.isCondition('sr5e', 'unknown')).toBe(false)
    })

    it('isCondition returns false for unregistered system', () => {
      const { evaluator } = makeEvaluator()
      expect(evaluator.isCondition('nope', 'anything')).toBe(false)
    })

    it('sr5e actor context conditions evaluate correctly', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [
        makeConditionEntry('prone', '@actor.conditions.prone == true'),
        makeConditionEntry('flanked', '@actor.conditions.flanked == true'),
      ])
      const ctx = makeSr5eActorContext()
      // Default actor context has prone: false, flanked: false
      expect(evaluator.evaluate('sr5e', 'prone', ctx)).toBe(false)
      expect(evaluator.evaluate('sr5e', 'flanked', ctx)).toBe(false)
    })
  })

  describe('Group 3', () => {
    it('evaluateAll returns empty object for unregistered system', () => {
      const { evaluator } = makeEvaluator()
      expect(evaluator.evaluateAll('ghost-system', {})).toEqual({})
    })

    it('evaluate unknown conditionId on empty registry returns false', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { evaluator } = makeEvaluator()
      expect(evaluator.evaluate('sr5e', 'prone', {})).toBe(false)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('truthy non-boolean result coerced to true', () => {
      const { evaluator, registry } = makeEvaluator()
      // "@count" resolves to 5 (truthy), so !!5 === true
      registry.register('sr5e', [makeConditionEntry('has-count', '@count')])
      const result = evaluator.evaluate('sr5e', 'has-count', { count: 5 } as any)
      expect(result).toBe(true)
    })

    it('falsy non-boolean result coerced to false', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [makeConditionEntry('has-count', '@count')])
      const result = evaluator.evaluate('sr5e', 'has-count', { count: 0 } as any)
      expect(result).toBe(false)
    })
  })

  describe('Group 4', () => {
    it('two systems — sr5e condition does not bleed into dcc namespace', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [makeConditionEntry('prone', '@prone == true')])
      registry.register('dcc', [makeConditionEntry('cursed', '@cursed == true')])
      expect(evaluator.isCondition('sr5e', 'cursed')).toBe(false)
      expect(evaluator.isCondition('dcc', 'prone')).toBe(false)
    })

    it('two systems — each evaluates own conditions independently', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [makeConditionEntry('prone', '@prone == true')])
      registry.register('dcc', [makeConditionEntry('cursed', '@cursed == true')])
      const ctx = { prone: true, cursed: true } as any
      expect(evaluator.evaluate('sr5e', 'prone', ctx)).toBe(true)
      expect(evaluator.evaluate('dcc', 'cursed', ctx)).toBe(true)
    })

    it('evaluateAll with one null-returning condition — others still evaluated', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [
        makeConditionEntry('broken', '1 / 0'),
        makeConditionEntry('ok1', '@a == true'),
        makeConditionEntry('ok2', '@b == true'),
      ])
      const ctx = { a: true, b: false } as any
      const result = evaluator.evaluateAll('sr5e', ctx)
      expect(result['broken']).toBe(false)
      expect(result['ok1']).toBe(true)
      expect(result['ok2']).toBe(false)
      warnSpy.mockRestore()
    })

    it('context deep-equal after evaluateAll with multiple conditions', () => {
      const { evaluator, registry } = makeEvaluator()
      registry.register('sr5e', [
        makeConditionEntry('c1', '@x > 0'),
        makeConditionEntry('c2', '@y < 10'),
        makeConditionEntry('c3', '@z == true'),
      ])
      const ctx = { x: 5, y: 3, z: true } as any
      const snapshot = JSON.parse(JSON.stringify(ctx))
      evaluator.evaluateAll('sr5e', ctx)
      expect(ctx).toEqual(snapshot)
    })
  })
})
