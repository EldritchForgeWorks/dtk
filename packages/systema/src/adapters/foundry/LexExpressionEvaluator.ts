import type { IExpressionEvaluator, EvaluationContext } from '../../ports/IExpressionEvaluator.js'

export class LexExpressionEvaluator implements IExpressionEvaluator {
  canEvaluate(_expression: string): boolean {
    return true
  }

  evaluate(expression: string, context: EvaluationContext): unknown {
    const dtk = (game as { dtk?: { api?: <T>(id: string) => T | undefined } }).dtk
    const lex = dtk?.api?.('dtk-lex') as
      | { evaluate?: (expr: string, ctx: EvaluationContext) => unknown }
      | undefined
    if (!lex?.evaluate) throw new Error('dtk-lex not available')
    return lex.evaluate(expression, context)
  }
}
