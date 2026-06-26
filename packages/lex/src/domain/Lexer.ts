import { type Token, TokenType } from './Token.js';

export class Lexer {
  tokenise(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
      const pos = i;
      const ch = expr[i]!;

      // whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        i++;
        continue;
      }

      // number
      if (ch >= '0' && ch <= '9') {
        let num = '';
        while (i < expr.length && ((expr[i]! >= '0' && expr[i]! <= '9') || expr[i]! === '.')) {
          num += expr[i++];
        }
        tokens.push({ type: TokenType.NUMBER, value: parseFloat(num), pos });
        continue;
      }

      // string literal
      if (ch === '"') {
        i++; // skip opening quote
        let str = '';
        let closed = false;
        while (i < expr.length) {
          if (expr[i] === '\\' && expr[i + 1] === '"') {
            str += '"';
            i += 2;
          } else if (expr[i] === '"') {
            i++; // skip closing quote
            closed = true;
            break;
          } else {
            str += expr[i++];
          }
        }
        if (!closed) {
          tokens.push({ type: TokenType.LEXER_ERROR, value: 'Unterminated string literal', pos });
        } else {
          tokens.push({ type: TokenType.STRING, value: str, pos });
        }
        continue;
      }

      // @-reference
      if (ch === '@') {
        i++; // skip @
        let ref = '';
        while (i < expr.length && /[A-Za-z0-9_.]/u.test(expr[i]!)) {
          ref += expr[i++];
        }
        tokens.push({ type: TokenType.AT_REF, value: ref, pos });
        continue;
      }

      // identifier
      if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_') {
        let id = '';
        while (i < expr.length && /[A-Za-z0-9_]/u.test(expr[i]!)) {
          id += expr[i++];
        }
        tokens.push({ type: TokenType.IDENTIFIER, value: id, pos });
        continue;
      }

      // parens / comma
      if (ch === '(') { tokens.push({ type: TokenType.LPAREN, value: '(', pos }); i++; continue; }
      if (ch === ')') { tokens.push({ type: TokenType.RPAREN, value: ')', pos }); i++; continue; }
      if (ch === ',') { tokens.push({ type: TokenType.COMMA,  value: ',', pos }); i++; continue; }

      // multi-char operators
      if (ch === '=' && expr[i + 1] === '=') { tokens.push({ type: TokenType.OP, value: '==', pos }); i += 2; continue; }
      if (ch === '!' && expr[i + 1] === '=') { tokens.push({ type: TokenType.OP, value: '!=', pos }); i += 2; continue; }
      if (ch === '<' && expr[i + 1] === '=') { tokens.push({ type: TokenType.OP, value: '<=', pos }); i += 2; continue; }
      if (ch === '>' && expr[i + 1] === '=') { tokens.push({ type: TokenType.OP, value: '>=', pos }); i += 2; continue; }
      if (ch === '&' && expr[i + 1] === '&') { tokens.push({ type: TokenType.OP, value: '&&', pos }); i += 2; continue; }
      if (ch === '|' && expr[i + 1] === '|') { tokens.push({ type: TokenType.OP, value: '||', pos }); i += 2; continue; }

      // single-char operators
      if ('+-*/%<>!?:'.includes(ch)) {
        tokens.push({ type: TokenType.OP, value: ch, pos });
        i++;
        continue;
      }

      // unrecognised
      tokens.push({ type: TokenType.LEXER_ERROR, value: ch, pos });
      i++;
    }

    tokens.push({ type: TokenType.EOF, value: '', pos: i });
    return tokens;
  }
}
