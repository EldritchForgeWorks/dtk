import type { ActorSnapshot } from './IExpressionDelegate.js';

export interface IActorRepository {
  getSnapshot(actorId: string): ActorSnapshot | null;
}
