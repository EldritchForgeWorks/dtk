export interface EvaluationContext {
  actor?: Record<string, unknown>
  item?: Record<string, unknown>
  targets?: ReadonlyArray<Record<string, unknown>>
  [key: string]: unknown
}

export interface IExpressionEvaluator {
  evaluate(expression: string, context: EvaluationContext): unknown
  canEvaluate(expression: string): boolean
}
