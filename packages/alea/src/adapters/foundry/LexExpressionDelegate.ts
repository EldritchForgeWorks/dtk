// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const game: any;

import type {
  IExpressionDelegate,
  EvaluationContext,
} from '../../ports/IExpressionDelegate.js';

export class LexExpressionDelegate implements IExpressionDelegate {
  evaluate(expression: string, context: EvaluationContext): unknown | null {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return game?.dtk?.api?.('dtk-lex')?.evaluate(expression, context) ?? null;
  }
}
