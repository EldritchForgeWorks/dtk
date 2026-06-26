// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const game: any;

import type { ICombatStateStore } from '../../ports/ICombatStateStore.js';
import {
  SequenceExecution,
  type SequenceExecutionSnapshot,
} from '../../domain/entities/SequenceExecution.js';

export class FoundryCombatStateStore implements ICombatStateStore {
  async save(execution: SequenceExecution): Promise<void> {
    await game.combat?.setFlag('dtk-alea', execution.sequenceId, execution.toSnapshot());
  }

  async load(sequenceId: string): Promise<SequenceExecution | null> {
    const snap = game.combat?.getFlag('dtk-alea', sequenceId) as
      | SequenceExecutionSnapshot
      | undefined;
    if (!snap) return null;
    return SequenceExecution.fromSnapshot(snap);
  }

  async delete(sequenceId: string): Promise<void> {
    await game.combat?.unsetFlag('dtk-alea', sequenceId);
  }

  async loadByActorId(actorId: string): Promise<SequenceExecution | null> {
    const flags = (game.combat?.flags?.['dtk-alea'] ?? {}) as Record<string, SequenceExecutionSnapshot>;
    for (const snap of Object.values(flags)) {
      if (snap?.context?.initiator?.id === actorId && snap?.status === 'queued') {
        return SequenceExecution.fromSnapshot(snap);
      }
    }
    return null;
  }

  async clearQueued(): Promise<void> {
    const flags = (game.combat?.flags?.['dtk-alea'] ?? {}) as Record<string, SequenceExecutionSnapshot>;
    for (const [key, snap] of Object.entries(flags)) {
      if (snap?.status === 'queued') {
        await game.combat?.unsetFlag('dtk-alea', key);
      }
    }
  }
}
