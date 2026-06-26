import type { ActorSnapshot } from '../../../src/domain/value-objects/ActorSnapshot.js'
import type { ResolvedTarget } from '../../../src/domain/value-objects/ResolvedTarget.js'
import type { RollContext } from '../../../src/domain/value-objects/RollContext.js'
import type { PendingDecisionPayload } from '../../../src/domain/entities/PendingDecision.js'
import type { ActionExemplar } from '../../../src/domain/services/ActionLoader.js'
import type { CombatSnapshot } from '../../../src/domain/value-objects/CombatSnapshot.js'

export function makeActorSnapshot(overrides?: Partial<ActorSnapshot>): ActorSnapshot {
  return {
    actorId: 'actor-1',
    tokenId: 'token-1',
    name: 'Test Actor',
    system: { health: 10, ammo: 5 },
    flags: {
      'dtk-systema': {
        actions: ['action-1'],
        exemplars: {
          'action-1': {
            label: 'Strike',
            description: 'Make a basic attack',
            condition: null,
            targetingMode: 'token',
            executionMode: 'per-target',
            iconPath: null,
          },
        },
      },
    },
    actionIds: ['action-1'],
    ...overrides,
  }
}

export function makeResolvedTarget(overrides?: Partial<ResolvedTarget>): ResolvedTarget {
  return {
    actorId: 'target-actor-1',
    tokenId: 'target-token-1',
    snapshot: makeActorSnapshot({ actorId: 'target-actor-1', tokenId: 'target-token-1' }),
    ...overrides,
  }
}

export function makeRollContext(overrides?: Partial<RollContext>): RollContext {
  return {
    initiator: makeActorSnapshot(),
    targets: [],
    actionId: 'action-1',
    itemId: null,
    combat: null,
    stepInputs: {},
    ...overrides,
  }
}

export function makePendingDecisionPayload(
  overrides?: Partial<PendingDecisionPayload>,
): PendingDecisionPayload {
  return {
    sequenceId: 'seq-1',
    stepId: 'step-1',
    choices: [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
    ],
    actorId: 'actor-1',
    pendingAt: 1000,
    timeout: 30000,
    defaultChoice: 'a',
    ...overrides,
  }
}

export function makeActionExemplar(overrides?: Partial<ActionExemplar>): ActionExemplar {
  return {
    id: 'action-1',
    label: 'Strike',
    description: 'Make a basic attack',
    condition: null,
    targetingMode: 'token',
    executionMode: 'per-target',
    iconPath: null,
    ...overrides,
  }
}

export function makeCombatSnapshot(overrides?: Partial<CombatSnapshot>): CombatSnapshot {
  return {
    round: 1,
    turn: 0,
    combatantId: 'combatant-1',
    combatId: 'combat-1',
    ...overrides,
  }
}
