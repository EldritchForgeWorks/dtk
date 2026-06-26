import type { ICombatStateStore } from '../../ports/ICombatStateStore.js';
import type { IHookEmitter } from '../../ports/IHookEmitter.js';
import type { EvaluationContext } from '../../ports/IExpressionDelegate.js';
import type {
  RollContext,
  SequenceStep,
  StepCondition,
} from '../entities/SequenceExecution.js';
import { SequenceExecution } from '../entities/SequenceExecution.js';
import { RitusRegistry } from './RitusRegistry.js';
import { RollResolver } from './RollResolver.js';
import { ExpressionParser } from './ExpressionParser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEvalContext(execution: SequenceExecution): EvaluationContext {
  const { context } = execution;
  return {
    initiator: context.initiator,
    target: context.targets[0] ?? null,
    item: context.item,
    combat: context.combat,
    stepOutputs: new Map(Object.entries(execution.stepOutputsRecord)),
  };
}

function evalCondition(
  cond: StepCondition,
  parser: ExpressionParser,
  ctx: EvaluationContext,
): boolean {
  const lhs = parser.resolveAny(cond.field, ctx);
  const rhs = cond.value;
  switch (cond.op) {
    case 'eq':  return lhs === rhs;
    case 'neq': return lhs !== rhs;
    case 'gt':  return typeof lhs === 'number' && lhs > (rhs as number);
    case 'lt':  return typeof lhs === 'number' && lhs < (rhs as number);
    case 'gte': return typeof lhs === 'number' && lhs >= (rhs as number);
    case 'lte': return typeof lhs === 'number' && lhs <= (rhs as number);
    default:    return false;
  }
}

// ---------------------------------------------------------------------------
// SequenceExecutor
// ---------------------------------------------------------------------------

export class SequenceExecutor {
  constructor(
    private readonly resolver: RollResolver,
    private readonly store: ICombatStateStore,
    private readonly emitter: IHookEmitter,
    private readonly registry: RitusRegistry,
    private readonly parser: ExpressionParser,
  ) {}

  async execute(context: RollContext): Promise<void> {
    const execution = SequenceExecution.create(
      context.sequenceExemplarId,
      context,
    );
    execution.status = 'running';
    await this.runFrom(execution);
  }

  async resume(sequenceId: string, choice: unknown): Promise<void> {
    const execution = await this.store.load(sequenceId);
    if (!execution) {
      console.warn(`SequenceExecutor: no execution found for sequenceId "${sequenceId}"`);
      return;
    }

    // The stepIndex points to the await step that suspended; record its choice
    const exemplar = execution.context.sequenceExemplar;
    const awaitStep = exemplar.steps[execution.stepIndex] as SequenceStep | undefined;
    if (awaitStep) {
      execution.recordChoice(awaitStep.id, choice);
    }

    execution.resume();
    execution.advance();
    await this.runFrom(execution);
  }

  private async runFrom(execution: SequenceExecution): Promise<void> {
    const exemplar = execution.context.sequenceExemplar;
    const steps = exemplar.steps;

    while (execution.stepIndex < steps.length) {
      const step = steps[execution.stepIndex];
      const ctx = buildEvalContext(execution);

      // Evaluate condition
      if (step.condition) {
        const pass = evalCondition(step.condition, this.parser, ctx);
        if (!pass) {
          execution.recordStepOutput(step.id, null);
          execution.advance();
          continue;
        }
      }

      if (step.type === 'await') {
        execution.suspend(Date.now());
        await this.store.save(execution);
        this.emitter.emit('dtk-alea.await', {
          sequenceId: execution.sequenceId,
          stepId: step.id,
          choices: step.choices,
          actorId: execution.context.initiator.id,
          ...(step.timeout !== undefined ? { timeout: step.timeout } : {}),
          ...(step.default !== undefined ? { default: step.default } : {}),
        });
        return;
      }

      // Rule step
      if (step.type === 'rule') {
        const ritusConfig = this.registry.resolve(execution.context.systemId, {
          ...(step.threshold !== undefined ? { threshold: step.threshold } : {}),
          ...(step.tiers !== undefined ? { tiers: step.tiers } : {}),
        });

        const rollResult = this.resolver.resolve(
          { type: 'rule', id: step.id, pool: step.pool, opposed: step.opposed },
          ctx,
          ritusConfig,
        );

        execution.recordStepOutput(step.id, rollResult);

        // Apply on_tier consequence
        let damage: number | null | undefined;
        let effect: string | undefined;
        let message: string | undefined;

        const consequence = step.on_tier?.[rollResult.tier];
        if (consequence) {
          if (consequence.damage) {
            const updatedCtx = buildEvalContext(execution);
            damage = this.parser.evaluate(consequence.damage, updatedCtx);
          }
          if (consequence.chain) {
            const updatedCtx = buildEvalContext(execution);
            const chainResult = this.resolver.resolve(
              { type: 'rule', id: `${step.id}.chain`, pool: consequence.chain.pool },
              updatedCtx,
              ritusConfig,
            );
            execution.recordStepOutput(`${step.id}.chain`, chainResult);
          }
          effect = consequence.effect;
          message = consequence.message;
        }

        this.emitter.emit('dtk-alea.step', {
          sequenceId: execution.sequenceId,
          stepId: step.id,
          tier: rollResult.tier,
          netHits: rollResult.netHits,
          ...(damage !== undefined ? { damage } : {}),
          ...(effect !== undefined ? { effect } : {}),
          ...(message !== undefined ? { message } : {}),
        });

        execution.advance();
        continue;
      }

      // Unknown step type — skip
      execution.advance();
    }

    // All steps done
    execution.complete();
    this.emitter.emit('dtk-alea.complete', {
      sequenceId: execution.sequenceId,
      exemplarId: execution.exemplarId,
      stepOutputs: execution.stepOutputsRecord,
    });
    await this.store.delete(execution.sequenceId);
  }
}
