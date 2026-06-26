export const enum TokenType {
  NUMBER      = 'NUMBER',
  STRING      = 'STRING',
  IDENTIFIER  = 'IDENTIFIER',
  AT_REF      = 'AT_REF',
  OP          = 'OP',
  LPAREN      = 'LPAREN',
  RPAREN      = 'RPAREN',
  COMMA       = 'COMMA',
  EOF         = 'EOF',
  LEXER_ERROR = 'LEXER_ERROR',
}

export interface Token {
  readonly type: TokenType;
  readonly value: string | number;
  readonly pos: number;
}
