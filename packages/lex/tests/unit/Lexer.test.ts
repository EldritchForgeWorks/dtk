import { describe, it, expect } from 'vitest'
import { Lexer } from '../../src/domain/Lexer.js'
import { TokenType } from '../../src/domain/Token.js'

describe('Lexer', () => {
  const lexer = new Lexer()

  describe('Group 1', () => {
    it('arithmetic expression tokenised', () => {
      const tokens = lexer.tokenise('@agility + 2')
      expect(tokens[0]?.type).toBe(TokenType.AT_REF)
      expect(tokens[0]?.value).toBe('agility')
      expect(tokens[1]?.type).toBe(TokenType.OP)
      expect(tokens[1]?.value).toBe('+')
      expect(tokens[2]?.type).toBe(TokenType.NUMBER)
      expect(tokens[2]?.value).toBe(2)
      expect(tokens[3]?.type).toBe(TokenType.EOF)
    })

    it('function call tokenised', () => {
      const tokens = lexer.tokenise('floor(@strength * 1.5)')
      expect(tokens[0]?.type).toBe(TokenType.IDENTIFIER)
      expect(tokens[0]?.value).toBe('floor')
      expect(tokens[1]?.type).toBe(TokenType.LPAREN)
      expect(tokens[2]?.type).toBe(TokenType.AT_REF)
      expect(tokens[2]?.value).toBe('strength')
      expect(tokens[3]?.type).toBe(TokenType.OP)
      expect(tokens[3]?.value).toBe('*')
      expect(tokens[4]?.type).toBe(TokenType.NUMBER)
      expect(tokens[4]?.value).toBe(1.5)
      expect(tokens[5]?.type).toBe(TokenType.RPAREN)
      expect(tokens[6]?.type).toBe(TokenType.EOF)
    })

    it('unrecognised character produces LEXER_ERROR', () => {
      const tokens = lexer.tokenise('@attr ¶ 2')
      const errToken = tokens.find(t => t.type === TokenType.LEXER_ERROR)
      expect(errToken).toBeDefined()
    })

    it('string literal tokenised', () => {
      const tokens = lexer.tokenise('"hello world"')
      expect(tokens[0]?.type).toBe(TokenType.STRING)
      expect(tokens[0]?.value).toBe('hello world')
      expect(tokens[1]?.type).toBe(TokenType.EOF)
    })

    it('`@scope.path` produces AT_REF token', () => {
      const tokens = lexer.tokenise('@actor.agility')
      expect(tokens[0]?.type).toBe(TokenType.AT_REF)
      expect(tokens[0]?.value).toBe('actor.agility')
    })

    it('empty input produces only EOF', () => {
      const tokens = lexer.tokenise('')
      expect(tokens).toHaveLength(1)
      expect(tokens[0]?.type).toBe(TokenType.EOF)
    })
  })

  describe('Group 2', () => {
    it('single digit number tokenised as NUMBER', () => {
      const tokens = lexer.tokenise('5')
      expect(tokens[0]?.type).toBe(TokenType.NUMBER)
      expect(tokens[0]?.value).toBe(5)
    })

    it('float number tokenised correctly', () => {
      const tokens = lexer.tokenise('3.14')
      expect(tokens[0]?.type).toBe(TokenType.NUMBER)
      expect(tokens[0]?.value).toBe(3.14)
    })

    it('empty string literal tokenised', () => {
      const tokens = lexer.tokenise('""')
      expect(tokens[0]?.type).toBe(TokenType.STRING)
      expect(tokens[0]?.value).toBe('')
    })

    it('escaped quote in string literal', () => {
      const tokens = lexer.tokenise('"say \\"hi\\""')
      expect(tokens[0]?.type).toBe(TokenType.STRING)
      expect(tokens[0]?.value).toBe('say "hi"')
    })

    it('comma produces COMMA token', () => {
      const tokens = lexer.tokenise(',')
      expect(tokens[0]?.type).toBe(TokenType.COMMA)
    })

    it('parens produce LPAREN and RPAREN tokens', () => {
      const tokens = lexer.tokenise('()')
      expect(tokens[0]?.type).toBe(TokenType.LPAREN)
      expect(tokens[1]?.type).toBe(TokenType.RPAREN)
    })

    it('two-char operators tokenised correctly', () => {
      for (const op of ['==', '!=', '<=', '>=', '&&', '||']) {
        const tokens = lexer.tokenise(op)
        expect(tokens[0]?.type).toBe(TokenType.OP)
        expect(tokens[0]?.value).toBe(op)
      }
    })
  })

  describe('Group 3', () => {
    it('unclosed string literal produces LEXER_ERROR', () => {
      const tokens = lexer.tokenise('"oops')
      const errToken = tokens.find(t => t.type === TokenType.LEXER_ERROR)
      expect(errToken).toBeDefined()
    })

    it('multiple unrecognised characters produce multiple LEXER_ERROR tokens', () => {
      const tokens = lexer.tokenise('¶§')
      const errTokens = tokens.filter(t => t.type === TokenType.LEXER_ERROR)
      expect(errTokens.length).toBeGreaterThanOrEqual(2)
    })

    it('single unrecognised character produces LEXER_ERROR and continues', () => {
      const tokens = lexer.tokenise('1 ¶ 2')
      expect(tokens.some(t => t.type === TokenType.LEXER_ERROR)).toBe(true)
      expect(tokens.some(t => t.type === TokenType.NUMBER && t.value === 1)).toBe(true)
      expect(tokens.some(t => t.type === TokenType.NUMBER && t.value === 2)).toBe(true)
    })
  })

  describe('Group 4', () => {
    it('complex expression mixing all token types', () => {
      const tokens = lexer.tokenise('max(@a, 3) >= 2 ? "yes" : "no"')
      const types = tokens.map(t => t.type)
      expect(types).toContain(TokenType.IDENTIFIER)
      expect(types).toContain(TokenType.LPAREN)
      expect(types).toContain(TokenType.AT_REF)
      expect(types).toContain(TokenType.COMMA)
      expect(types).toContain(TokenType.NUMBER)
      expect(types).toContain(TokenType.RPAREN)
      expect(types).toContain(TokenType.OP)
      expect(types).toContain(TokenType.STRING)
      expect(types).toContain(TokenType.EOF)
    })

    it('AT_REF immediately after operator', () => {
      const tokens = lexer.tokenise('2+@x')
      expect(tokens[0]?.type).toBe(TokenType.NUMBER)
      expect(tokens[1]?.type).toBe(TokenType.OP)
      expect(tokens[2]?.type).toBe(TokenType.AT_REF)
    })

    it('number immediately after RPAREN', () => {
      const tokens = lexer.tokenise('(3)4')
      expect(tokens[0]?.type).toBe(TokenType.LPAREN)
      expect(tokens[1]?.type).toBe(TokenType.NUMBER)
      expect(tokens[1]?.value).toBe(3)
      expect(tokens[2]?.type).toBe(TokenType.RPAREN)
      expect(tokens[3]?.type).toBe(TokenType.NUMBER)
      expect(tokens[3]?.value).toBe(4)
    })

    it('AT_REF with multi-level dot path', () => {
      const tokens = lexer.tokenise('@actor.conditions.prone')
      expect(tokens[0]?.type).toBe(TokenType.AT_REF)
      expect(tokens[0]?.value).toBe('actor.conditions.prone')
    })

    it('all single-char operators tokenised', () => {
      for (const op of ['+', '-', '*', '/', '%', '<', '>', '?', ':']) {
        const tokens = lexer.tokenise(op)
        expect(tokens[0]?.type).toBe(TokenType.OP)
        expect(tokens[0]?.value).toBe(op)
      }
    })
  })
})
