import type {
  IExpressionDelegate,
  EvaluationContext,
} from '../../ports/IExpressionDelegate.js';

export class NullExpressionDelegate implements IExpressionDelegate {
  evaluate(_expression: string, _context: EvaluationContext): null {
    return null;
  }
}
