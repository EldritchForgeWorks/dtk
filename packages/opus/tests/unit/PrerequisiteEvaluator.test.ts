import { describe, it, expect } from 'vitest'
import { PrerequisiteEvaluator } from '../../src/domain/PrerequisiteEvaluator'
import type { EvalContext } from '../../src/domain/PrerequisiteEvaluator'
import { makeFormaWithAdvancement, makeFormaWithComplexPrerequisites } from '../fixtures/forma'
import { makeCharacterBuild } from '../fixtures/build'

class SpyLexDelegate {
  public calls: Array<{ expression: string }> = []
  public returnValue: boolean | null = true

  evaluate(expression: string, _context: Record<string, unknown>): boolean | null {
    this.calls.push({ expression })
    return this.returnValue
  }
}

describe('PrerequisiteEvaluator', () => {
  describe('Group 1', () => {
    it('step equality satisfied/not satisfied', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { archetype: 'street-samurai' } }
      expect(evaluator.evaluate("@steps.archetype.choice == 'street-samurai'", ctx)).toBe(true)
      expect(evaluator.evaluate("@steps.archetype.choice == 'face'", ctx)).toBe(false)
    })

    it('advancement ownership satisfied', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctxWith: EvalContext = { steps: {}, advancements: ['street-cred'] }
      const ctxWithout: EvalContext = { steps: {}, advancements: [] }
      expect(evaluator.evaluate("@build.advancements.includes('street-cred')", ctxWith)).toBe(true)
      expect(evaluator.evaluate("@build.advancements.includes('street-cred')", ctxWithout)).toBe(false)
    })

    it('AND composition', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { archetype: 'street-samurai', metatype: 'elf' } }
      const bothTrue = "@steps.archetype.choice == 'street-samurai' && @steps.metatype.choice == 'elf'"
      const oneFalse = "@steps.archetype.choice == 'street-samurai' && @steps.metatype.choice == 'human'"
      expect(evaluator.evaluate(bothTrue, ctx)).toBe(true)
      expect(evaluator.evaluate(oneFalse, ctx)).toBe(false)
    })

    it('Lex delegation called for complex expression', () => {
      const spy = new SpyLexDelegate()
      spy.returnValue = true
      const evaluator = new PrerequisiteEvaluator(spy)
      const ctx: EvalContext = { steps: { attributes: { body: 8 } } }
      const result = evaluator.evaluate('floor(@steps.attributes.body / 2) >= 3', ctx)
      expect(spy.calls.length).toBeGreaterThan(0)
      expect(result).toBe(true)
    })

    it('complex expression without Lex treated as satisfied + warning', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: {} }
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        const result = evaluator.evaluate('floor(@steps.attributes.body / 2) >= 3', ctx)
        expect(result).toBe(true)
        expect(warnings.length).toBeGreaterThan(0)
      } finally {
        console.warn = origWarn
      }
    })

    it('Lex null result treated as satisfied + warning', () => {
      const spy = new SpyLexDelegate()
      spy.returnValue = null
      const evaluator = new PrerequisiteEvaluator(spy)
      const ctx: EvalContext = { steps: {} }
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        const result = evaluator.evaluate('floor(@steps.attributes.body / 2) >= 3', ctx)
        expect(result).toBe(true)
        expect(warnings.length).toBeGreaterThan(0)
      } finally {
        console.warn = origWarn
      }
    })

    it('build unchanged after evaluation', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const build = makeCharacterBuild()
      const stepsBefore = JSON.parse(JSON.stringify(build.steps))
      const ctx: EvalContext = { steps: build.steps, advancements: build.advancements.map(a => a.id) }
      evaluator.evaluate("@steps.archetype.choice == 'street-samurai'", ctx)
      expect(build.steps).toEqual(stepsBefore)
    })

    it('bulk evaluateAll returns all advancements', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const forma = makeFormaWithAdvancement('xp')
      const build = makeCharacterBuild()
      const result = evaluator.evaluateAll(forma, build)
      const tracks = (forma.advancement as { tracks: unknown[] }).tracks
      expect(Object.keys(result).length).toBe(tracks.length)
    })

    it("failed bulk evaluation doesn't abort", () => {
      const spy = new SpyLexDelegate()
      spy.returnValue = null
      const evaluator = new PrerequisiteEvaluator(spy)
      const forma = makeFormaWithComplexPrerequisites()
      const build = makeCharacterBuild()
      const result = evaluator.evaluateAll(forma, build)
      expect(Object.keys(result).length).toBeGreaterThan(0)
      const firstKey = Object.keys(result)[0]
      expect(result[firstKey]).toBe(true)
    })

  })

  describe('Group 2', () => {
    it('OR composition returns true when first side is true', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { archetype: 'street-samurai' } }
      const expr = "@steps.archetype.choice == 'street-samurai' || @steps.archetype.choice == 'face'"
      expect(evaluator.evaluate(expr, ctx)).toBe(true)
    })

    it('OR composition returns true when second side is true', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { archetype: 'face' } }
      const expr = "@steps.archetype.choice == 'street-samurai' || @steps.archetype.choice == 'face'"
      expect(evaluator.evaluate(expr, ctx)).toBe(true)
    })
  })

  describe('Group 3', () => {
    it('step reference to undefined step returns false for equality', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: {} }
      expect(evaluator.evaluate("@steps.archetype.choice == 'something'", ctx)).toBe(false)
    })

    it('empty expression returns true', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      expect(evaluator.evaluate('', { steps: {} })).toBe(true)
    })
  })

  describe('Group 4', () => {
    it('repeated evaluate calls do not mutate context', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const ctx: EvalContext = { steps: { archetype: 'street-samurai' } }
      const originalKeys = Object.keys(ctx.steps)
      evaluator.evaluate("@steps.archetype.choice == 'street-samurai'", ctx)
      evaluator.evaluate("@steps.archetype.choice == 'face'", ctx)
      expect(Object.keys(ctx.steps)).toEqual(originalKeys)
    })

    it('evaluateAll with no-requires tracks returns true for all', () => {
      const evaluator = new PrerequisiteEvaluator(null)
      const forma = makeFormaWithAdvancement('xp')
      const build = makeCharacterBuild()
      const result = evaluator.evaluateAll(forma, build)
      expect(result['enhanced-strength']).toBe(true)
      expect(result['quick-reflexes']).toBe(true)
      expect(result['street-cred']).toBe(true)
    })
  })
})
