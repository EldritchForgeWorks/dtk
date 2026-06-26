import type { IExpressionEvaluator, EvaluationContext } from '../../ports/IExpressionEvaluator.js'

export class StubExpressionEvaluator implements IExpressionEvaluator {
  private readonly results = new Map<string, unknown>()
  private readonly evaluableMap = new Map<string, boolean>()

  setResult(expression: string, result: unknown): this {
    this.results.set(expression, result)
    return this
  }

  setCanEvaluate(expression: string, can: boolean): this {
    this.evaluableMap.set(expression, can)
    return this
  }

  evaluate(expression: string, _context: EvaluationContext): unknown {
    if (this.results.has(expression)) {
      return this.results.get(expression)
    }
    return true
  }

  canEvaluate(expression: string): boolean {
    if (this.evaluableMap.has(expression)) {
      return this.evaluableMap.get(expression)!
    }
    return true
  }
}
