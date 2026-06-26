import { describe, it, expect, vi } from 'vitest'
import { Interpreter } from '../../src/domain/Interpreter.js'
import { FunctionRegistry } from '../../src/domain/FunctionRegistry.js'
import { ExpressionEngine } from '../../src/domain/ExpressionEngine.js'
import { Lexer } from '../../src/domain/Lexer.js'
import { Parser } from '../../src/domain/Parser.js'
import type { ASTNode } from '../../src/domain/ASTNode.js'
import { makeExpressionContext } from '../fixtures/context.js'

describe('Interpreter', () => {
  const lexer = new Lexer()
  const parser = new Parser()

  function makeInterpreter(fns?: FunctionRegistry): Interpreter {
    return new Interpreter(fns ?? new FunctionRegistry())
  }

  function evaluate(expr: string, ctx: Record<string, unknown> = {}) {
    const engine = new ExpressionEngine()
    return engine.evaluate(expr, ctx as any)
  }

  describe('Group 1', () => {
    it('@-reference from context', () => {
      const result = evaluate('@agility', makeExpressionContext({ agility: 6 }))
      expect(result).toBe(6)
    })

    it('conditional true/false branch', () => {
      const ctxTrue = makeExpressionContext({ prone: true, pool: 8 })
      expect(evaluate('@prone ? 0 : @pool', ctxTrue)).toBe(0)

      const ctxFalse = makeExpressionContext({ prone: false, pool: 8 })
      expect(evaluate('@prone ? 0 : @pool', ctxFalse)).toBe(8)
    })

    it('unknown reference → null', () => {
      expect(evaluate('@nonexistent', {})).toBeNull()
    })

    it('ParseError node → null + warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const interp = makeInterpreter()
      const ast: ASTNode = { kind: 'parse_error', message: 'test parse error', pos: 0 }
      const result = interp.evaluate(ast, {})
      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('test parse error'))
      warnSpy.mockRestore()
    })

    it('division by zero → null + warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = evaluate('@agility / 0', makeExpressionContext())
      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('division by zero'))
      warnSpy.mockRestore()
    })

    it('null coercion in arithmetic', () => {
      // @missing is null → null + 5 → 0 + 5 = 5
      expect(evaluate('@missing + 5', {})).toBe(5)
    })
  })

  describe('Group 2', () => {
    it('AT_REF with depth-3 dot path resolves', () => {
      const ctx = { actor: { stats: { agility: 7 } } } as any
      expect(evaluate('@actor.stats.agility', ctx)).toBe(7)
    })

    it('boolean coercion in arithmetic: true + 2 = 3', () => {
      const ctx = { flag: true } as any
      expect(evaluate('@flag + 2', ctx)).toBe(3)
    })

    it('logical && short-circuits on false left', () => {
      const ctx = { flag: false } as any
      const result = evaluate('@flag && @nonexistent', ctx)
      expect(result).toBeFalsy()
    })

    it('logical || short-circuits on true left', () => {
      const ctx = { flag: true } as any
      const result = evaluate('@flag || @nonexistent', ctx)
      expect(result).toBeTruthy()
    })

    it('unary ! on boolean', () => {
      expect(evaluate('!@prone', makeExpressionContext({ prone: true }))).toBe(false)
      expect(evaluate('!@prone', makeExpressionContext({ prone: false }))).toBe(true)
    })

    it('unary minus negates value', () => {
      expect(evaluate('-@agility', makeExpressionContext({ agility: 4 }))).toBe(-4)
    })

    it('comparison operators', () => {
      const ctx = makeExpressionContext({ agility: 6 })
      expect(evaluate('@agility > 5', ctx)).toBe(true)
      expect(evaluate('@agility < 5', ctx)).toBe(false)
      expect(evaluate('@agility >= 6', ctx)).toBe(true)
      expect(evaluate('@agility <= 5', ctx)).toBe(false)
      expect(evaluate('@agility == 6', ctx)).toBe(true)
      expect(evaluate('@agility != 6', ctx)).toBe(false)
    })
  })

  describe('Group 3', () => {
    it('floor() applied to float', () => {
      expect(evaluate('floor(@agility * 1.5)', makeExpressionContext({ agility: 5 }))).toBe(7)
    })

    it('ceil() applied to float', () => {
      expect(evaluate('ceil(@agility * 1.5)', makeExpressionContext({ agility: 5 }))).toBe(8)
    })

    it('round() applied to float', () => {
      expect(evaluate('round(2.5)', {})).toBe(3)
    })

    it('max() returns larger value', () => {
      expect(evaluate('max(3, 7)', {})).toBe(7)
    })

    it('min() returns smaller value', () => {
      expect(evaluate('min(3, 7)', {})).toBe(3)
    })

    it('clamp() bounds value above hi', () => {
      expect(evaluate('clamp(@net_hits, 0, 4)', makeExpressionContext({ net_hits: 6 }))).toBe(4)
    })

    it('clamp() keeps value within range', () => {
      expect(evaluate('clamp(@net_hits, 0, 4)', makeExpressionContext({ net_hits: 2 }))).toBe(2)
    })

    it('abs() returns absolute value', () => {
      expect(evaluate('abs(-5)', {})).toBe(5)
    })

    it('if() returns true branch when condition truthy', () => {
      expect(evaluate('if(1, 10, 20)', {})).toBe(10)
    })

    it('if() returns false branch when condition falsy', () => {
      expect(evaluate('if(0, 10, 20)', {})).toBe(20)
    })

    it('unknown function call returns null + warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = evaluate('roll(@agility)', makeExpressionContext())
      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('roll'))
      warnSpy.mockRestore()
    })

    it('FunctionRegistry.register warns on collision then replaces', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fns = new FunctionRegistry()
      fns.register('floor', () => 999)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('floor'))
      const interp = new Interpreter(fns)
      const ast: ASTNode = {
        kind: 'call',
        name: 'floor',
        args: [{ kind: 'number', value: 3.7 }],
      }
      expect(interp.evaluate(ast, {})).toBe(999)
      warnSpy.mockRestore()
    })
  })

  describe('Group 4', () => {
    it('nested function calls: floor(max(@a, @b) * 1.5)', () => {
      const ctx = makeExpressionContext({ a: 4, b: 6 })
      // max(4,6)=6, 6*1.5=9, floor(9)=9
      expect(evaluate('floor(max(@a, @b) * 1.5)', ctx)).toBe(9)
    })

    it('AT_REF inside function arg resolves correctly', () => {
      const ctx = makeExpressionContext({ agility: 5 })
      expect(evaluate('floor(@agility * 1.5)', ctx)).toBe(7)
    })

    it('conditional with function call in consequent branch', () => {
      const ctx = makeExpressionContext({ prone: true, agility: 4 })
      expect(evaluate('@prone ? floor(@agility * 0.5) : @agility', ctx)).toBe(2)
    })

    it('AT_REF on nested context with conditions sub-object', () => {
      const ctx = { actor: { agility: 6, conditions: { prone: true } } } as any
      expect(evaluate('@actor.agility', ctx)).toBe(6)
      expect(evaluate('@actor.conditions.prone', ctx)).toBe(true)
    })

    it('remainder operator %', () => {
      expect(evaluate('10 % 3', {})).toBe(1)
    })

    it('subtraction operator', () => {
      expect(evaluate('10 - 3', {})).toBe(7)
    })

    it('multiplication operator', () => {
      expect(evaluate('4 * 3', {})).toBe(12)
    })

    it('string literal evaluates to string value', () => {
      const tokens = lexer.tokenise('"hello"')
      const ast = parser.parse(tokens)
      const interp = makeInterpreter()
      expect(interp.evaluate(ast, {})).toBe('hello')
    })
  })
})
