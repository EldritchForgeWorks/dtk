import { describe, it, expect } from 'vitest';
import { InMemoryCombatStateStore } from '../../../../src/adapters/in-memory/InMemoryCombatStateStore.js';
import { SequenceExecution } from '../../../../src/domain/entities/SequenceExecution.js';
import { makeRollContext } from '../../../fixtures/exemplar.js';

function makeQueued(actorId = 'actor-1'): SequenceExecution {
  const ctx = makeRollContext({
    initiator: { id: actorId, name: 'Actor', system: {} },
  });
  return SequenceExecution.create('exemplar-1', ctx);
}

function makeSuspended(actorId = 'actor-1'): SequenceExecution {
  const exec = makeQueued(actorId);
  exec.suspend(1000);
  return exec;
}

// Boundary

describe('InMemoryCombatStateStore — Boundary', () => {
  it('empty store has size 0', () => {
    const store = new InMemoryCombatStateStore();
    expect(store.size()).toBe(0);
  });

  it('has() returns false on empty store', () => {
    const store = new InMemoryCombatStateStore();
    expect(store.has('nonexistent')).toBe(false);
  });

  it('load() returns null for unknown sequenceId', async () => {
    const store = new InMemoryCombatStateStore();
    expect(await store.load('no-such-id')).toBeNull();
  });

  it('save() increments size by one', async () => {
    const store = new InMemoryCombatStateStore();
    await store.save(makeQueued());
    expect(store.size()).toBe(1);
  });

  it('delete() on unknown id is a no-op (no throw)', async () => {
    const store = new InMemoryCombatStateStore();
    await expect(store.delete('unknown')).resolves.toBeUndefined();
  });
});

// Scenario

describe('InMemoryCombatStateStore — Scenario', () => {
  it('save + load round-trip returns the same object', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueued();
    await store.save(exec);
    const loaded = await store.load(exec.sequenceId);
    expect(loaded).toBe(exec);
  });

  it('has() returns true after save()', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueued();
    await store.save(exec);
    expect(store.has(exec.sequenceId)).toBe(true);
  });

  it('delete() removes the entry; load() returns null afterward', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueued();
    await store.save(exec);
    await store.delete(exec.sequenceId);
    expect(await store.load(exec.sequenceId)).toBeNull();
    expect(store.has(exec.sequenceId)).toBe(false);
    expect(store.size()).toBe(0);
  });

  it('loadByActorId() returns queued entry for matching actorId', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueued('actor-42');
    await store.save(exec);
    const found = await store.loadByActorId('actor-42');
    expect(found).toBe(exec);
  });

  it('loadByActorId() returns null when no queued entry matches actorId', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueued('actor-A');
    await store.save(exec);
    expect(await store.loadByActorId('actor-B')).toBeNull();
  });

  it('loadByActorId() ignores suspended entries (only returns queued)', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeSuspended('actor-1');
    await store.save(exec);
    expect(await store.loadByActorId('actor-1')).toBeNull();
  });

  it('clearQueued() removes all queued entries', async () => {
    const store = new InMemoryCombatStateStore();
    await store.save(makeQueued('actor-1'));
    await store.save(makeQueued('actor-2'));
    await store.clearQueued();
    expect(store.size()).toBe(0);
  });

  it('clearQueued() leaves suspended entries intact', async () => {
    const store = new InMemoryCombatStateStore();
    const suspended = makeSuspended('actor-1');
    const queued = makeQueued('actor-2');
    await store.save(suspended);
    await store.save(queued);

    await store.clearQueued();

    expect(store.size()).toBe(1);
    expect(store.has(suspended.sequenceId)).toBe(true);
    expect(store.has(queued.sequenceId)).toBe(false);
  });
});

// Failure

describe('InMemoryCombatStateStore — Failure', () => {
  it('load() after delete() returns null', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueued();
    await store.save(exec);
    await store.delete(exec.sequenceId);
    expect(await store.load(exec.sequenceId)).toBeNull();
  });

  it('loadByActorId() returns null on empty store', async () => {
    const store = new InMemoryCombatStateStore();
    expect(await store.loadByActorId('actor-1')).toBeNull();
  });

  it('clearQueued() on store with only suspended entries does not change size', async () => {
    const store = new InMemoryCombatStateStore();
    await store.save(makeSuspended('actor-1'));
    await store.save(makeSuspended('actor-2'));
    await store.clearQueued();
    expect(store.size()).toBe(2);
  });
});

// Combinatorial

describe('InMemoryCombatStateStore — Combinatorial', () => {
  it('save multiple actors, load each by sequenceId independently', async () => {
    const store = new InMemoryCombatStateStore();
    const exec1 = makeQueued('actor-1');
    const exec2 = makeQueued('actor-2');
    const exec3 = makeQueued('actor-3');

    await store.save(exec1);
    await store.save(exec2);
    await store.save(exec3);

    expect(await store.load(exec1.sequenceId)).toBe(exec1);
    expect(await store.load(exec2.sequenceId)).toBe(exec2);
    expect(await store.load(exec3.sequenceId)).toBe(exec3);
    expect(store.size()).toBe(3);
  });

  it('mixed queued and suspended: clearQueued leaves only suspended', async () => {
    const store = new InMemoryCombatStateStore();
    const q1 = makeQueued('actor-1');
    const q2 = makeQueued('actor-2');
    const s1 = makeSuspended('actor-3');
    const s2 = makeSuspended('actor-4');

    await store.save(q1);
    await store.save(q2);
    await store.save(s1);
    await store.save(s2);

    await store.clearQueued();

    expect(store.size()).toBe(2);
    expect(store.has(q1.sequenceId)).toBe(false);
    expect(store.has(q2.sequenceId)).toBe(false);
    expect(store.has(s1.sequenceId)).toBe(true);
    expect(store.has(s2.sequenceId)).toBe(true);
  });

  it('save → delete → save again restores the entry', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueued();

    await store.save(exec);
    await store.delete(exec.sequenceId);
    expect(store.size()).toBe(0);

    await store.save(exec);
    expect(store.size()).toBe(1);
    expect(await store.load(exec.sequenceId)).toBe(exec);
  });

  it('loadByActorId finds queued actor among mixed-status entries', async () => {
    const store = new InMemoryCombatStateStore();
    const suspended = makeSuspended('actor-1');
    const queued = makeQueued('actor-1');

    // Note: two entries for same actorId (different sequenceIds)
    await store.save(suspended);
    await store.save(queued);

    const found = await store.loadByActorId('actor-1');
    // loadByActorId returns the first queued match
    expect(found).toBe(queued);
    expect(found!.status).toBe('queued');
  });
});
