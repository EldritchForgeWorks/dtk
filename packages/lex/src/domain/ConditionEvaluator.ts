import type { ExpressionContext } from './ExpressionContext.js';
import type { CodexRegistry } from './CodexRegistry.js';
import type { ExpressionEngine } from './ExpressionEngine.js';

export class ConditionEvaluator {
  constructor(
    private readonly registry: CodexRegistry,
    private readonly engine: ExpressionEngine,
  ) {}

  isCondition(systemId: string, slug: string): boolean {
    const entry = this.registry.resolve(systemId, slug);
    return entry != null && entry.condition != null && entry.condition !== '';
  }

  evaluate(systemId: string, conditionId: string, context: ExpressionContext): boolean {
    const entry = this.registry.resolve(systemId, conditionId);
    if (!entry) {
      console.warn(`ConditionEvaluator: unknown condition "${conditionId}" for system "${systemId}"`);
      return false;
    }
    if (!entry.condition || entry.condition === '') {
      console.warn(`ConditionEvaluator: entry "${conditionId}" has no condition expression`);
      return false;
    }
    const result = this.engine.evaluate(entry.condition, context);
    if (result === null) {
      console.warn(`ConditionEvaluator: condition "${conditionId}" evaluated to null`);
      return false;
    }
    return !!result;
  }

  evaluateAll(systemId: string, context: ExpressionContext): Record<string, boolean> {
    const slugs = this.registry.listConditionSlugs(systemId);
    const result: Record<string, boolean> = {};
    for (const slug of slugs) {
      try {
        result[slug] = this.evaluate(systemId, slug, context);
      } catch {
        result[slug] = false;
      }
    }
    return result;
  }
}
