import { describe, it, expect } from 'vitest'
import { Parser } from '../../src/domain/Parser.js'
import { Lexer } from '../../src/domain/Lexer.js'
import type { BinaryNode, ConditionalNode, CallNode, UnaryNode, ParseError } from '../../src/domain/ASTNode.js'
import { TokenType } from '../../src/domain/Token.js'

describe('Parser', () => {
  const lexer = new Lexer()
  const parser = new Parser()

  function parse(expr: string) {
    return parser.parse(lexer.tokenise(expr))
  }

  describe('Group 1', () => {
    it('conditional expression parsed with correct associativity', () => {
      const ast = parse('@cover ? @dice - 2 : @dice')
      expect(ast.kind).toBe('conditional')
      const cond = ast as ConditionalNode
      expect(cond.condition.kind).toBe('at_ref')
      expect((cond.condition as any).path).toBe('cover')
      expect(cond.consequent.kind).toBe('binary')
      expect((cond.consequent as BinaryNode).op).toBe('-')
      expect(cond.alternate.kind).toBe('at_ref')
    })

    it('operator precedence respected', () => {
      const ast = parse('2 + 3 * 4')
      expect(ast.kind).toBe('binary')
      const bin = ast as BinaryNode
      expect(bin.op).toBe('+')
      expect(bin.left.kind).toBe('number')
      expect(bin.right.kind).toBe('binary')
      expect((bin.right as BinaryNode).op).toBe('*')
    })

    it('nested parentheses', () => {
      const ast = parse('((2))')
      expect(ast.kind).toBe('number')
      expect((ast as any).value).toBe(2)
    })

    it('function call node', () => {
      const ast = parse('max(@a, @b)')
      expect(ast.kind).toBe('call')
      const call = ast as CallNode
      expect(call.name).toBe('max')
      expect(call.args).toHaveLength(2)
      expect(call.args[0]?.kind).toBe('at_ref')
      expect(call.args[1]?.kind).toBe('at_ref')
    })

    it('binary AND/OR', () => {
      const ast = parse('@a && @b || @c')
      // || has lower precedence than &&, so: (@a && @b) || @c
      expect(ast.kind).toBe('binary')
      expect((ast as BinaryNode).op).toBe('||')
      expect((ast as BinaryNode).left.kind).toBe('binary')
      expect(((ast as BinaryNode).left as BinaryNode).op).toBe('&&')
    })

    it('comparison operators', () => {
      const ast = parse('@x >= 3')
      expect(ast.kind).toBe('binary')
      expect((ast as BinaryNode).op).toBe('>=')
      expect((ast as BinaryNode).left.kind).toBe('at_ref')
      expect((ast as BinaryNode).right.kind).toBe('number')
    })

    it('parse error node returned for incomplete expression', () => {
      const ast = parse('@attr +')
      expect(ast.kind).toBe('parse_error')
    })
  })

  describe('Group 2', () => {
    it('single number node', () => {
      const ast = parse('42')
      expect(ast.kind).toBe('number')
      expect((ast as any).value).toBe(42)
    })

    it('single AT_REF node', () => {
      const ast = parse('@agility')
      expect(ast.kind).toBe('at_ref')
      expect((ast as any).path).toBe('agility')
    })

    it('string literal node', () => {
      const ast = parse('"hello"')
      expect(ast.kind).toBe('string')
      expect((ast as any).value).toBe('hello')
    })

    it('call node with zero args', () => {
      const ast = parse('floor()')
      expect(ast.kind).toBe('call')
      expect((ast as CallNode).name).toBe('floor')
      expect((ast as CallNode).args).toHaveLength(0)
    })

    it('parentheses override precedence', () => {
      const ast = parse('(2 + 3) * 4')
      expect(ast.kind).toBe('binary')
      expect((ast as BinaryNode).op).toBe('*')
      expect((ast as BinaryNode).left.kind).toBe('binary')
      expect(((ast as BinaryNode).left as BinaryNode).op).toBe('+')
    })

    it('unary negation node', () => {
      const ast = parse('-@x')
      expect(ast.kind).toBe('unary')
      expect((ast as UnaryNode).op).toBe('-')
      expect((ast as UnaryNode).operand.kind).toBe('at_ref')
    })

    it('unary not node', () => {
      const ast = parse('!@prone')
      expect(ast.kind).toBe('unary')
      expect((ast as UnaryNode).op).toBe('!')
    })
  })

  describe('Group 3', () => {
    it(') alone produces ParseError', () => {
      const ast = parse(')')
      expect(ast.kind).toBe('parse_error')
    })

    it('token stream with LEXER_ERROR produces ParseError', () => {
      const ast = parse('¶')
      expect(ast.kind).toBe('parse_error')
    })

    it('empty token stream (just EOF) produces ParseError', () => {
      const ast = parser.parse([{ type: TokenType.EOF, value: '', pos: 0 }])
      expect(ast.kind).toBe('parse_error')
    })

    it('ParseError carries a message', () => {
      const ast = parse('@attr +')
      expect(ast.kind).toBe('parse_error')
      expect((ast as ParseError).message).toBeTruthy()
    })

    it('missing closing paren produces ParseError', () => {
      const ast = parse('max(@a, @b')
      expect(ast.kind).toBe('parse_error')
    })
  })

  describe('Group 4', () => {
    it('complex expression: !@prone && @cover ? clamp(@pool, 0, 6) : 0', () => {
      const ast = parse('!@prone && @cover ? clamp(@pool, 0, 6) : 0')
      expect(ast.kind).toBe('conditional')
      const cond = ast as ConditionalNode
      expect(cond.condition.kind).toBe('binary')
      expect((cond.condition as BinaryNode).op).toBe('&&')
      expect(cond.consequent.kind).toBe('call')
      expect((cond.consequent as CallNode).name).toBe('clamp')
      expect((cond.consequent as CallNode).args).toHaveLength(3)
      expect(cond.alternate.kind).toBe('number')
    })

    it('unary minus inside binary: -@val + 2', () => {
      const ast = parse('-@val + 2')
      expect(ast.kind).toBe('binary')
      expect((ast as BinaryNode).op).toBe('+')
      expect((ast as BinaryNode).left.kind).toBe('unary')
      expect(((ast as BinaryNode).left as UnaryNode).op).toBe('-')
    })

    it('equality operator == produces binary node', () => {
      const ast = parse('@x == 1')
      expect(ast.kind).toBe('binary')
      expect((ast as BinaryNode).op).toBe('==')
    })

    it('inequality operator != produces binary node', () => {
      const ast = parse('@x != 0')
      expect(ast.kind).toBe('binary')
      expect((ast as BinaryNode).op).toBe('!=')
    })

    it('nested function calls: floor(max(@a, @b) * 1.5)', () => {
      const ast = parse('floor(max(@a, @b) * 1.5)')
      expect(ast.kind).toBe('call')
      const outer = ast as CallNode
      expect(outer.name).toBe('floor')
      expect(outer.args).toHaveLength(1)
      expect(outer.args[0]?.kind).toBe('binary')
    })
  })
})
