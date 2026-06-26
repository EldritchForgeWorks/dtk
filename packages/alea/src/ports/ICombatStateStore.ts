import type { SequenceExecution } from '../domain/entities/SequenceExecution.js';

export interface ICombatStateStore {
  save(execution: SequenceExecution): Promise<void>;
  load(sequenceId: string): Promise<SequenceExecution | null>;
  delete(sequenceId: string): Promise<void>;
  loadByActorId(actorId: string): Promise<SequenceExecution | null>;
  clearQueued(): Promise<void>;
}
