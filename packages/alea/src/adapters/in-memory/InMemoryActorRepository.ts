import type { IActorRepository } from '../../ports/IActorRepository.js';
import type { ActorSnapshot } from '../../ports/IExpressionDelegate.js';

export class InMemoryActorRepository implements IActorRepository {
  private readonly store = new Map<string, ActorSnapshot>();

  set(actor: ActorSnapshot): void {
    this.store.set(actor.id, actor);
  }

  getSnapshot(actorId: string): ActorSnapshot | null {
    return this.store.get(actorId) ?? null;
  }
}
