// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const game: any;

import type { ActorSnapshot } from '../../ports/IExpressionDelegate.js';
import type { IActorRepository } from '../../ports/IActorRepository.js';

export class FoundryActorRepository implements IActorRepository {
  getSnapshot(actorId: string): ActorSnapshot | null {
    const actor = game.actors?.get(actorId);
    if (!actor) return null;
    return {
      id: actor.id as string,
      name: actor.name as string,
      system: actor.system as Record<string, unknown>,
    };
  }
}
