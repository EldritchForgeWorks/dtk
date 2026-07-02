import { describe, it, expect } from 'vitest';
import { InMemoryActorRepository } from '../../../../src/adapters/in-memory/InMemoryActorRepository.js';
import type { ActorSnapshot } from '../../../../src/ports/IExpressionDelegate.js';

const makeActor = (id: string): ActorSnapshot => ({
  id,
  name: `Actor ${id}`,
  system: {},
});

describe('InMemoryActorRepository', () => {
  it('returns actor after set', () => {
    const repo = new InMemoryActorRepository();
    const actor = makeActor('actor-1');
    repo.set(actor);
    expect(repo.getSnapshot('actor-1')).toEqual(actor);
  });

  it('returns null for unknown id', () => {
    const repo = new InMemoryActorRepository();
    expect(repo.getSnapshot('no-such-actor')).toBeNull();
  });
});
