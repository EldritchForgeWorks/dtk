import { type Token, TokenType } from './Token.js';
import type { ASTNode, ParseError } from './ASTNode.js';

export class Parser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(tokens: Token[]): ASTNode {
    this.tokens = tokens;
    this.pos = 0;

    if (tokens.length === 0 || tokens[0]?.type === TokenType.EOF) {
      return { kind: 'parse_error', message: 'Empty expression', pos: 0 };
    }

    const node = this.parseConditional();
    return node;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '', pos: this.pos };
  }

  private advance(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private check(type: TokenType, value?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  private match(type: TokenType, value?: string): Token | null {
    if (this.check(type, value)) return this.advance();
    return null;
  }

  private parseConditional(): ASTNode {
    const cond = this.parseLogicalOr();
    if (this.match(TokenType.OP, '?')) {
      const consequent = this.parseConditional();
      if (!this.match(TokenType.OP, ':')) {
        return { kind: 'parse_error', message: "Expected ':' in conditional", pos: this.peek().pos };
      }
      const alternate = this.parseConditional();
      return { kind: 'conditional', condition: cond, consequent, alternate };
    }
    return cond;
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.check(TokenType.OP, '||')) {
      const op = this.advance().value as string;
      const right = this.parseLogicalAnd();
      if (right.kind === 'parse_error') return right;
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.check(TokenType.OP, '&&')) {
      const op = this.advance().value as string;
      const right = this.parseEquality();
      if (right.kind === 'parse_error') return right;
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    while (this.check(TokenType.OP, '==') || this.check(TokenType.OP, '!=')) {
      const op = this.advance().value as string;
      const right = this.parseComparison();
      if (right.kind === 'parse_error') return right;
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    while (
      this.check(TokenType.OP, '<') || this.check(TokenType.OP, '<=') ||
      this.check(TokenType.OP, '>') || this.check(TokenType.OP, '>=')
    ) {
      const op = this.advance().value as string;
      const right = this.parseAdditive();
      if (right.kind === 'parse_error') return right;
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (this.check(TokenType.OP, '+') || this.check(TokenType.OP, '-')) {
      const op = this.advance().value as string;
      const right = this.parseMultiplicative();
      if (right.kind === 'parse_error') return right;
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (this.check(TokenType.OP, '*') || this.check(TokenType.OP, '/') || this.check(TokenType.OP, '%')) {
      const op = this.advance().value as string;
      const right = this.parseUnary();
      if (right.kind === 'parse_error') return right;
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.check(TokenType.OP, '!') || this.check(TokenType.OP, '-')) {
      const op = this.advance().value as string;
      const operand = this.parseUnary();
      return { kind: 'unary', op, operand };
    }
    return this.parseCall();
  }

  private parseCall(): ASTNode {
    // Function call parsing (IDENTIFIER LPAREN args RPAREN) is handled in parsePrimary().
    // This level exists as a named precedence slot between unary and primary.
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();

    // LEXER_ERROR → ParseError
    if (t.type === TokenType.LEXER_ERROR) {
      this.advance();
      return { kind: 'parse_error', message: `Lexer error: unrecognised character '${t.value}'`, pos: t.pos };
    }

    // EOF → ParseError
    if (t.type === TokenType.EOF) {
      return { kind: 'parse_error', message: 'Unexpected end of expression', pos: t.pos };
    }

    // NUMBER
    if (t.type === TokenType.NUMBER) {
      this.advance();
      return { kind: 'number', value: t.value as number };
    }

    // STRING
    if (t.type === TokenType.STRING) {
      this.advance();
      return { kind: 'string', value: t.value as string };
    }

    // AT_REF
    if (t.type === TokenType.AT_REF) {
      this.advance();
      return { kind: 'at_ref', path: t.value as string };
    }

    // IDENTIFIER — check for boolean literals first
    if (t.type === TokenType.IDENTIFIER) {
      const name = t.value as string;
      if (name === 'true')  { this.advance(); return { kind: 'bool', value: true }; }
      if (name === 'false') { this.advance(); return { kind: 'bool', value: false }; }
      this.advance();
      if (this.check(TokenType.LPAREN)) {
        this.advance(); // consume LPAREN
        const args: ASTNode[] = [];
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseConditional());
          while (this.match(TokenType.COMMA)) {
            args.push(this.parseConditional());
          }
        }
        if (!this.match(TokenType.RPAREN)) {
          return { kind: 'parse_error', message: `Expected ')' after arguments to '${name}'`, pos: this.peek().pos };
        }
        return { kind: 'call', name, args };
      }
      // bare identifier treated as a string reference or parse error
      return { kind: 'parse_error', message: `Unexpected identifier '${name}'`, pos: t.pos };
    }

    // LPAREN → grouped expression
    if (t.type === TokenType.LPAREN) {
      this.advance();
      const inner = this.parseConditional();
      if (!this.match(TokenType.RPAREN)) {
        return { kind: 'parse_error', message: "Expected ')'", pos: this.peek().pos };
      }
      return inner;
    }

    // anything else
    this.advance();
    return { kind: 'parse_error', message: `Unexpected token '${t.value}'`, pos: t.pos };
  }
}
