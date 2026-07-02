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
  const rhs = typeof cond.value === 'string' && cond.value.startsWith('@')
    ? parser.resolveAny(cond.value, ctx)
    : cond.value;
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

function awaitButtonLabel(stepId: string, choice: string): string {
  const labels: Record<string, string> = {
    'await-defense': 'Roll Defense',
    'await-soak':    'Roll Soak',
    'await-drain':   'Roll Drain',
    'await-resist':  'Roll Resist',
  };
  return labels[stepId] ?? choice.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
        // If the step names a specific ritus by UUID, RollResolver handles the
        // lookup. Only call resolve() for the system-default fallback path.
        const stepRitusUUID = (step as Record<string, unknown>).ritus as string | undefined;
        const ritusConfig = stepRitusUUID
          ? null
          : this.registry.resolve(execution.context.systemId, {
              ...(step.threshold !== undefined ? { threshold: step.threshold } : {}),
              ...(step.tiers !== undefined ? { tiers: step.tiers } : {}),
            });

        const rollResult = await this.resolver.resolve(
          { type: 'rule', id: step.id, pool: step.pool, opposed: step.opposed, ritus: stepRitusUUID },
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
            const chainResult = await this.resolver.resolve(
              { type: 'rule', id: `${step.id}.chain`, pool: consequence.chain.pool },
              updatedCtx,
              ritusConfig,
            );
            execution.recordStepOutput(`${step.id}.chain`, chainResult);
          }
          effect = consequence.effect;
          message = consequence.message;
        }

        // Peek at next step — if it's a conditional await, embed button or on_skip message
        const nextStep = steps[execution.stepIndex + 1];
        let awaitMeta: Record<string, unknown> = {};
        if (nextStep?.type === 'await') {
          const peekCtx = buildEvalContext(execution);
          const awaitPasses = !nextStep.condition || evalCondition(nextStep.condition, this.parser, peekCtx);
          if (awaitPasses) {
            awaitMeta = {
              hasAwait:       true,
              awaitSequenceId: execution.sequenceId,
              awaitChoice:    nextStep.choices[0],
              awaitLabel:     awaitButtonLabel(nextStep.id, nextStep.choices[0] ?? 'continue'),
            };
          } else {
            const onSkip = (nextStep as Record<string, unknown>).on_skip as Record<string, unknown> | undefined;
            if (onSkip?.message && !message) message = onSkip.message as string;
          }
        }

        const _target = execution.context.targets[0];
        const _ar          = (execution.context.initiator.system['ar'] as number) || 0;
        const _dr          = _target ? ((_target.system['dr'] as number) || 0) : 0;
        const _defensePool = _target
          ? ((_target.system['reaction'] as number) || 0) + ((_target.system['intuition'] as number) || 0)
          : 0;
        const _soakPool = _target ? ((_target.system['body'] as number) || 0) : 0;

        this.emitter.emit('dtk-alea.step', {
          sequenceId:    execution.sequenceId,
          stepId:        step.id,
          initiatorName: execution.context.initiator.name,
          targetName:    execution.context.targets[0]?.name ?? null,
          ar:            _ar,
          dr:            _dr,
          defensePool:   _defensePool,
          soakPool:      _soakPool,
          tier:          rollResult.tier,
          mechanic:      rollResult.mechanic,
          netHits:       rollResult.netHits,
          hits:          rollResult.hits,
          faces:         rollResult.faces,
          pool:          rollResult.pool,
          rolls:         rollResult.rolls,
          ...(damage !== undefined ? { damage } : {}),
          ...(effect !== undefined ? { effect } : {}),
          ...(message !== undefined ? { message } : {}),
          ...awaitMeta,
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
