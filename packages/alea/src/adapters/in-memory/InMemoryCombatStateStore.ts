import type { ICombatStateStore } from '../../ports/ICombatStateStore.js';
import { SequenceExecution } from '../../domain/entities/SequenceExecution.js';

export class InMemoryCombatStateStore implements ICombatStateStore {
  private readonly map = new Map<string, SequenceExecution>();

  async save(execution: SequenceExecution): Promise<void> {
    this.map.set(execution.sequenceId, execution);
  }

  async load(sequenceId: string): Promise<SequenceExecution | null> {
    return this.map.get(sequenceId) ?? null;
  }

  async delete(sequenceId: string): Promise<void> {
    this.map.delete(sequenceId);
  }

  async loadByActorId(actorId: string): Promise<SequenceExecution | null> {
    for (const execution of this.map.values()) {
      if (execution.context.initiator.id === actorId && execution.status === 'queued') {
        return execution;
      }
    }
    return null;
  }

  async clearQueued(): Promise<void> {
    for (const [key, execution] of this.map.entries()) {
      if (execution.status === 'queued') {
        this.map.delete(key);
      }
    }
  }

  has(sequenceId: string): boolean {
    return this.map.has(sequenceId);
  }

  size(): number {
    return this.map.size;
  }
}
