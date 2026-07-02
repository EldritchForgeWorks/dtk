// Local type definitions matching @eldritchforgeworks/dtk-types contracts.
// Duplicated here to keep test fixtures independent of the package.

export interface ActorSnapshot {
  id: string;
  name: string;
  system: Record<string, unknown>;
}

export interface ItemSnapshot {
  id: string;
  name: string;
  system: Record<string, unknown>;
}

export interface CombatSnapshot {
  round: number;
  turn: number;
  combatantId: string;
}

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

export function makeActorSnapshot(overrides?: Partial<ActorSnapshot>): ActorSnapshot {
  return {
    id: 'actor-1',
    name: 'Test Actor',
    system: { agility: 4, strength: 3, skill: { firearms: 3, melee: 2 } },
    ...overrides,
  };
}

export function makeRuleStep(overrides?: Partial<RuleStep>): RuleStep {
  return {
    type: 'rule',
    id: 'step-1',
    pool: '6',
    ...overrides,
  };
}

export function makeAwaitStep(overrides?: Partial<AwaitStep>): AwaitStep {
  return {
    type: 'await',
    id: 'choice-1',
    choices: ['yes', 'no'],
    ...overrides,
  };
}

export function makeSequenceExemplar(
  steps?: SequenceStep[],
  overrides?: Partial<SequenceExemplar>,
): SequenceExemplar {
  return {
    id: 'seq-1',
    systemId: 'simple',
    steps: steps ?? [makeRuleStep()],
    ...overrides,
  };
}

export function makeRollContext(overrides?: Partial<RollContext>): RollContext {
  const exemplar = makeSequenceExemplar();
  return {
    systemId: 'simple',
    sequenceExemplarId: exemplar.id,
    sequenceExemplar: exemplar,
    initiator: makeActorSnapshot(),
    targets: [],
    item: null,
    combat: null,
    ...overrides,
  };
}
