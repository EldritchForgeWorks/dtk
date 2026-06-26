import { describe, it, expect, vi, afterEach } from 'vitest'
import { ConditionEvaluator } from '../../../../src/domain/services/ConditionEvaluator.js'
import { StubExpressionEvaluator } from '../../../../src/adapters/in-memory/StubExpressionEvaluator.js'
import type { EvaluationContext } from '../../../../src/ports/IExpressionEvaluator.js'

const makeCtx = (actor: Record<string, unknown> = {}): EvaluationContext => ({ actor })

describe('ConditionEvaluator', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('trivial expressions', () => {
    it('empty string returns true', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('', makeCtx())).toBe(true)
    })

    it('"true" literal returns true', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('true', makeCtx())).toBe(true)
    })

    it('"false" literal returns false', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('false', makeCtx())).toBe(false)
    })
  })

  describe('numeric comparisons', () => {
    it('@actor.ammo > 0 returns true when ammo=5', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.ammo > 0', makeCtx({ ammo: 5 }))).toBe(true)
    })

    it('@actor.ammo > 0 returns false when ammo=0', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.ammo > 0', makeCtx({ ammo: 0 }))).toBe(false)
    })

    it('@actor.hp >= 10 returns true when hp=10', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.hp >= 10', makeCtx({ hp: 10 }))).toBe(true)
    })

    it('@actor.hp < 5 returns true when hp=3', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.hp < 5', makeCtx({ hp: 3 }))).toBe(true)
    })

    it('@actor.hp <= 5 returns true when hp=5', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.hp <= 5', makeCtx({ hp: 5 }))).toBe(true)
    })

    it('@actor.hp != 0 returns true when hp=3', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.hp != 0', makeCtx({ hp: 3 }))).toBe(true)
    })

    it('@actor.hp == 10 returns true when hp=10', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.hp == 10', makeCtx({ hp: 10 }))).toBe(true)
    })
  })

  describe('string equality', () => {
    it('@actor.status == "active" returns true when status="active"', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.status == "active"', makeCtx({ status: 'active' }))).toBe(true)
    })

    it('@actor.status == "active" returns false when status="dead"', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('@actor.status == "active"', makeCtx({ status: 'dead' }))).toBe(false)
    })

    it("single-quoted string works: @actor.type == 'pc'", () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate("@actor.type == 'pc'", makeCtx({ type: 'pc' }))).toBe(true)
    })
  })

  describe('negation', () => {
    it('!@actor.stunned returns true when stunned=false', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('!@actor.stunned', makeCtx({ stunned: false }))).toBe(true)
    })

    it('!@actor.stunned returns false when stunned=true', () => {
      const ev = new ConditionEvaluator(null)
      expect(ev.evaluate('!@actor.stunned', makeCtx({ stunned: true }))).toBe(false)
    })
  })

  describe('nested paths', () => {
    it('resolves @actor.attributes.str correctly', () => {
      const ev = new ConditionEvaluator(null)
      const ctx = makeCtx({ attributes: { str: 12 } })
      expect(ev.evaluate('@actor.attributes.str > 10', ctx)).toBe(true)
    })

    it('returns false for missing nested path', () => {
      const ev = new ConditionEvaluator(null)
      const ctx = makeCtx({ attributes: {} })
      expect(ev.evaluate('@actor.attributes.str > 10', ctx)).toBe(false)
    })
  })

  describe('Lex delegate', () => {
    it('delegates complex expression to lexEvaluator when available', () => {
      const lex = new StubExpressionEvaluator()
      lex.setResult('complex(expr)', true)
      const ev = new ConditionEvaluator(lex)
      expect(ev.evaluate('complex(expr)', makeCtx())).toBe(true)
    })

    it('lex evaluator returning false gives false result', () => {
      const lex = new StubExpressionEvaluator()
      lex.setResult('complex(expr)', false)
      const ev = new ConditionEvaluator(lex)
      expect(ev.evaluate('complex(expr)', makeCtx())).toBe(false)
    })

    it('fails open with console.warn when no lex and expression is complex', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const ev = new ConditionEvaluator(null)
      const result = ev.evaluate('someComplexFunction()', makeCtx())
      expect(result).toBe(true)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('complex'))
    })
  })
})
