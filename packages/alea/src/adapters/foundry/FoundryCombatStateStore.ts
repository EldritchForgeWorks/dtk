// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// Uses an in-memory Map as primary store (works with or without active combat).
// When game.combat is available, also persists to flags for reload survival.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const game: any;

import type { ICombatStateStore } from '../../ports/ICombatStateStore.js';
import {
  SequenceExecution,
  type SequenceExecutionSnapshot,
} from '../../domain/entities/SequenceExecution.js';

export class FoundryCombatStateStore implements ICombatStateStore {
  private readonly _map = new Map<string, SequenceExecution>();

  async save(execution: SequenceExecution): Promise<void> {
    this._map.set(execution.sequenceId, execution);
    await game.combat?.setFlag('dtk-alea', execution.sequenceId, execution.toSnapshot());
  }

  async load(sequenceId: string): Promise<SequenceExecution | null> {
    const cached = this._map.get(sequenceId);
    if (cached) return cached;
    const snap = game.combat?.getFlag('dtk-alea', sequenceId) as
      | SequenceExecutionSnapshot
      | undefined;
    if (!snap) return null;
    return SequenceExecution.fromSnapshot(snap);
  }

  async delete(sequenceId: string): Promise<void> {
    this._map.delete(sequenceId);
    await game.combat?.unsetFlag('dtk-alea', sequenceId);
  }

  async loadByActorId(actorId: string): Promise<SequenceExecution | null> {
    for (const execution of this._map.values()) {
      if (execution.context.initiator.id === actorId && execution.status === 'queued') {
        return execution;
      }
    }
    const flags = (game.combat?.flags?.['dtk-alea'] ?? {}) as Record<string, SequenceExecutionSnapshot>;
    for (const snap of Object.values(flags)) {
      if (snap?.context?.initiator?.id === actorId && snap?.status === 'queued') {
        return SequenceExecution.fromSnapshot(snap);
      }
    }
    return null;
  }

  async clearQueued(): Promise<void> {
    for (const [key, execution] of this._map.entries()) {
      if (execution.status === 'queued') this._map.delete(key);
    }
    const flags = (game.combat?.flags?.['dtk-alea'] ?? {}) as Record<string, SequenceExecutionSnapshot>;
    for (const [key, snap] of Object.entries(flags)) {
      if (snap?.status === 'queued') {
        await game.combat?.unsetFlag('dtk-alea', key);
      }
    }
  }
}
