import { describe, it, expect } from 'vitest'
import { PrerequisiteEvaluator } from '../../src/domain/PrerequisiteEvaluator'
import type { EvalContext } from '../../src/domain/PrerequisiteEvaluator'

class SpyLexDelegate {
  public calls: Array<{ expression: string }> = []
  public returnValue: boolean | null = true

  evaluate(expression: string, _context: Record<string, unknown>): boolean | null {
    this.calls.push({ expression })
    return this.returnValue
  }
}

describe('PrerequisiteEvaluator — extra coverage', () => {
  describe('numeric comparison operators', () => {
    it('!= returns true when values differ', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { archetype: 'face' } }
      expect(evaluator.evaluate("@steps.archetype.choice != 'street-samurai'", ctx)).toBe(true)
    })

    it('!= returns false when values are equal', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { archetype: 'street-samurai' } }
      expect(evaluator.evaluate("@steps.archetype.choice != 'street-samurai'", ctx)).toBe(false)
    })

    it('>= returns true when value meets threshold', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { attrs: { body: 5 } } }
      expect(evaluator.evaluate('@steps.attrs.body >= 5', ctx)).toBe(true)
    })

    it('>= returns false when value is below threshold', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { attrs: { body: 3 } } }
      expect(evaluator.evaluate('@steps.attrs.body >= 5', ctx)).toBe(false)
    })

    it('<= returns true when value is at or below threshold', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { attrs: { level: 4 } } }
      expect(evaluator.evaluate('@steps.attrs.level <= 5', ctx)).toBe(true)
    })

    it('> returns true when value exceeds threshold', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { attrs: { body: 6 } } }
      expect(evaluator.evaluate('@steps.attrs.body > 5', ctx)).toBe(true)
    })

    it('> returns false when value does not exceed', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { attrs: { body: 5 } } }
      expect(evaluator.evaluate('@steps.attrs.body > 5', ctx)).toBe(false)
    })

    it('< returns true when value is below threshold', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { attrs: { level: 2 } } }
      expect(evaluator.evaluate('@steps.attrs.level < 5', ctx)).toBe(true)
    })
  })

  describe('@actor reference resolution', () => {
    it('@actor single-level reference resolved from context', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = {
        steps: {},
        actor: { wealth: 50 },
      }
      expect(evaluator.evaluate('@actor.wealth >= 30', ctx)).toBe(true)
    })

    it('@actor multi-level reference resolved from context', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = {
        steps: {},
        actor: { system: { wealth: { gold: 100 } } },
      }
      expect(evaluator.evaluate('@actor.system.wealth.gold >= 50', ctx)).toBe(true)
    })

    it('@actor reference returns false when actor missing', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: {} }
      expect(evaluator.evaluate('@actor.wealth >= 30', ctx)).toBe(false)
    })

    it('@actor reference returns false when nested path is undefined', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = {
        steps: {},
        actor: { system: {} },
      }
      expect(evaluator.evaluate('@actor.system.wealth.gold >= 50', ctx)).toBe(false)
    })
  })

  describe('non-simple, non-complex expression with lex delegate', () => {
    it('unrecognised simple-looking expression is passed to lex delegate', () => {
      const spy = new SpyLexDelegate()
      spy.returnValue = true
      const evaluator = new PrerequisiteEvaluator(spy)
      const ctx: EvalContext = { steps: {} }
      // Not @steps., not @actor., not @build.advancements — triggers !isSimpleAtom fallback
      const result = evaluator.evaluate('@unknown.field == 5', ctx)
      expect(spy.calls.length).toBeGreaterThan(0)
      expect(result).toBe(true)
    })

    it('unrecognised expression with lex returning null is treated as satisfied', () => {
      const spy = new SpyLexDelegate()
      spy.returnValue = null
      const evaluator = new PrerequisiteEvaluator(spy)
      const ctx: EvalContext = { steps: {} }
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        const result = evaluator.evaluate('@unknown.field == 5', ctx)
        expect(result).toBe(true)
        expect(warnings.length).toBeGreaterThan(0)
      } finally {
        console.warn = origWarn
      }
    })

    it('unrecognised expression without lex delegate treated as satisfied with warning', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: {} }
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        const result = evaluator.evaluate('@unknown.field == 5', ctx)
        expect(result).toBe(true)
        expect(warnings.length).toBeGreaterThan(0)
      } finally {
        console.warn = origWarn
      }
    })
  })

  describe('@steps reference edge cases', () => {
    it('step value is null — resolves to undefined for equality', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      // Provide null directly in steps
      const ctx: EvalContext = { steps: { archetype: null as unknown as unknown } }
      expect(evaluator.evaluate("@steps.archetype.choice == 'face'", ctx)).toBe(false)
    })

    it('step value is a plain string — field access returns undefined, equality is false', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      // archetype is 'street-samurai' (string), accessing .someField on a string returns undefined
      const ctx: EvalContext = { steps: { archetype: 'street-samurai' } }
      // @steps.archetype.someField → string value, not an object → resolveRef returns undefined
      expect(evaluator.evaluate("@steps.archetype.someField == 'street-samurai'", ctx)).toBe(false)
    })
  })
})
