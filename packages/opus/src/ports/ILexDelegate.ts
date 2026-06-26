export interface ILexDelegate {
  evaluate(expression: string, context: Record<string, unknown>): boolean | null
}
