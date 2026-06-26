export type Value = number | boolean | string | null;

export interface NumberNode      { readonly kind: 'number';      readonly value: number }
export interface BoolNode        { readonly kind: 'bool';        readonly value: boolean }
export interface StringNode      { readonly kind: 'string';      readonly value: string }
export interface AtRefNode       { readonly kind: 'at_ref';      readonly path: string }
export interface BinaryNode      { readonly kind: 'binary';      readonly op: string; readonly left: ASTNode; readonly right: ASTNode }
export interface UnaryNode       { readonly kind: 'unary';       readonly op: string; readonly operand: ASTNode }
export interface CallNode        { readonly kind: 'call';        readonly name: string; readonly args: readonly ASTNode[] }
export interface ConditionalNode { readonly kind: 'conditional'; readonly condition: ASTNode; readonly consequent: ASTNode; readonly alternate: ASTNode }
export interface ParseError      { readonly kind: 'parse_error'; readonly message: string; readonly pos: number }

export type ASTNode =
  | NumberNode | BoolNode | StringNode | AtRefNode | BinaryNode
  | UnaryNode  | CallNode | ConditionalNode | ParseError;
