import { describe, it, expect } from 'vitest'
import { StubExpressionEvaluator } from '../../../src/adapters/in-memory/StubExpressionEvaluator.js'

describe('StubExpressionEvaluator', () => {
  describe('evaluate', () => {
    it('returns true by default for unknown expression', () => {
      const ev = new StubExpressionEvaluator()
      expect(ev.evaluate('unknown', {})).toBe(true)
    })

    it('returns configured result for known expression', () => {
      const ev = new StubExpressionEvaluator().setResult('my-expr', false)
      expect(ev.evaluate('my-expr', {})).toBe(false)
    })

    it('returns configured result of any type', () => {
      const ev = new StubExpressionEvaluator().setResult('expr', 42)
      expect(ev.evaluate('expr', {})).toBe(42)
    })

    it('different expressions return their configured results independently', () => {
      const ev = new StubExpressionEvaluator()
        .setResult('a', true)
        .setResult('b', false)
      expect(ev.evaluate('a', {})).toBe(true)
      expect(ev.evaluate('b', {})).toBe(false)
    })

    it('supports chaining setResult', () => {
      const ev = new StubExpressionEvaluator()
      expect(ev.setResult('x', 1)).toBe(ev)
    })
  })

  describe('canEvaluate', () => {
    it('returns true by default for unknown expression', () => {
      const ev = new StubExpressionEvaluator()
      expect(ev.canEvaluate('anything')).toBe(true)
    })

    it('returns configured value for known expression', () => {
      const ev = new StubExpressionEvaluator().setCanEvaluate('complex', false)
      expect(ev.canEvaluate('complex')).toBe(false)
    })

    it('returns true when explicitly configured to true', () => {
      const ev = new StubExpressionEvaluator().setCanEvaluate('simple', true)
      expect(ev.canEvaluate('simple')).toBe(true)
    })

    it('supports chaining setCanEvaluate', () => {
      const ev = new StubExpressionEvaluator()
      expect(ev.setCanEvaluate('x', true)).toBe(ev)
    })
  })
})
