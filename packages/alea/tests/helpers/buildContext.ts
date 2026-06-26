import type { EvaluationContext } from '../../src/ports/IExpressionDelegate.js';
import type { SequenceExecution } from '../../src/domain/entities/SequenceExecution.js';

/**
 * Builds an EvaluationContext from a SequenceExecution for use in domain tests.
 * Extracts initiator, target, item, combat from execution.context and
 * converts stepOutputsRecord to a Map for ExpressionParser compatibility.
 */
export function buildEvalContext(execution: SequenceExecution): EvaluationContext {
  const { context } = execution;
  const stepOutputs = new Map<string, unknown>(
    Object.entries(execution.stepOutputsRecord),
  );
  return {
    initiator: context.initiator,
    target: context.targets[0] ?? null,
    item: context.item,
    combat: context.combat,
    stepOutputs,
  };
}

/**
 * Builds a bare EvaluationContext from raw data — useful when no SequenceExecution
 * exists yet (e.g., early ExpressionParser tests).
 */
export function buildBareEvalContext(
  overrides?: Partial<EvaluationContext>,
): EvaluationContext {
  return {
    initiator: {
      id: 'actor-1',
      name: 'Test Actor',
      system: { agility: 4, strength: 3, skill: { firearms: 3, melee: 2 } },
    },
    target: null,
    item: null,
    combat: null,
    stepOutputs: new Map(),
    ...overrides,
  };
}
