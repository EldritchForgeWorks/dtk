import type {
  ActorSnapshot,
  ItemSnapshot,
  CombatSnapshot,
} from '../../ports/IExpressionDelegate.js';
import type { StepOutput } from '../value-objects/StepOutput.js';

// ---------------------------------------------------------------------------
// Domain types for RollContext (mirrors @eldritchforgeworks/dtk-types contracts)
// ---------------------------------------------------------------------------

export interface TierConsequence {
  damage?: string;
  chain?: { pool: string; mechanic: string };
  effect?: string;
  message?: string;
}

export interface StepCondition {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
  value: unknown;
}

export interface RuleStep {
  type: 'rule';
  id: string;
  pool: string;
  opposed?: string;
  threshold?: number;
  tiers?: Record<string, number>;
  condition?: StepCondition;
  on_tier?: Record<string, TierConsequence>;
  [key: string]: unknown;
}

export interface AwaitStep {
  type: 'await';
  id: string;
  choices: string[];
  timeout?: number;
  default?: string | null;
  condition?: StepCondition;
  [key: string]: unknown;
}

export type SequenceStep = RuleStep | AwaitStep;

export interface SequenceExemplar {
  id: string;
  systemId: string;
  steps: SequenceStep[];
}

export interface RollContext {
  systemId: string;
  sequenceExemplarId: string;
  sequenceExemplar: SequenceExemplar;
  initiator: ActorSnapshot;
  targets: ActorSnapshot[];
  item: ItemSnapshot | null;
  combat: CombatSnapshot | null;
}

// ---------------------------------------------------------------------------
// Aggregate types
// ---------------------------------------------------------------------------

export type SequenceStatus = 'queued' | 'running' | 'suspended' | 'complete';

export interface SequenceExecutionSnapshot {
  sequenceId: string;
  exemplarId: string;
  stepIndex: number;
  stepOutputs: Record<string, unknown>;
  context: RollContext;
  suspendedAt?: number;
  status: SequenceStatus;
}

// ---------------------------------------------------------------------------
// Aggregate root
// ---------------------------------------------------------------------------

export class SequenceExecution {
  readonly sequenceId: string;
  readonly exemplarId: string;
  stepIndex: number;
  private readonly _stepOutputs: Map<string, unknown>;
  readonly context: RollContext;
  suspendedAt: number | undefined;
  status: SequenceStatus;

  private constructor(data: SequenceExecutionSnapshot) {
    this.sequenceId = data.sequenceId;
    this.exemplarId = data.exemplarId;
    this.stepIndex = data.stepIndex;
    this.context = data.context;
    this.suspendedAt = data.suspendedAt;
    this.status = data.status;
    this._stepOutputs = new Map(Object.entries(data.stepOutputs));
  }

  static create(exemplarId: string, context: RollContext): SequenceExecution {
    return new SequenceExecution({
      sequenceId: crypto.randomUUID(),
      exemplarId,
      stepIndex: 0,
      stepOutputs: {},
      context,
      status: 'queued',
    });
  }

  static fromSnapshot(data: SequenceExecutionSnapshot): SequenceExecution {
    if (!data.sequenceId) throw new Error('SequenceExecution: sequenceId is required');
    if (!data.context) throw new Error('SequenceExecution: context is required');
    if (!data.status) throw new Error('SequenceExecution: status is required');
    return new SequenceExecution(data);
  }

  toSnapshot(): SequenceExecutionSnapshot {
    const snap: SequenceExecutionSnapshot = {
      sequenceId: this.sequenceId,
      exemplarId: this.exemplarId,
      stepIndex: this.stepIndex,
      stepOutputs: this.stepOutputsRecord,
      context: this.context,
      status: this.status,
    };
    if (this.suspendedAt !== undefined) snap.suspendedAt = this.suspendedAt;
    return snap;
  }

  recordStepOutput(stepId: string, output: StepOutput): void {
    this._stepOutputs.set(stepId, output);
  }

  recordChoice(stepId: string, choice: unknown): void {
    this._stepOutputs.set(`${stepId}.choice`, choice);
  }

  getStepOutput(stepId: string): unknown {
    return this._stepOutputs.get(stepId);
  }

  advance(): void {
    this.stepIndex += 1;
  }

  suspend(timestamp?: number): void {
    this.status = 'suspended';
    this.suspendedAt = timestamp;
  }

  resume(): void {
    this.status = 'running';
    this.suspendedAt = undefined;
  }

  complete(): void {
    this.status = 'complete';
  }

  get stepOutputsRecord(): Record<string, unknown> {
    return Object.fromEntries(this._stepOutputs);
  }
}
