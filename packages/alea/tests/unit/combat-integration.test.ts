import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCombatTurnHandler, makeCombatRoundHandler } from '../../src/combat/combatHandlers.js';
import { InMemoryCombatStateStore } from '../../src/adapters/in-memory/InMemoryCombatStateStore.js';
import { SpyHookEmitter } from '../../src/adapters/in-memory/SpyHookEmitter.js';
import { DeterministicDiceRoller } from '../../src/adapters/in-memory/DeterministicDiceRoller.js';
import { NullExpressionDelegate } from '../../src/adapters/in-memory/NullExpressionDelegate.js';
import { SequenceExecution } from '../../src/domain/entities/SequenceExecution.js';
import type { AleaApi } from '../../src/AleaApi.js';
import { makeRollContext } from '../fixtures/exemplar.js';

function makeApi(): AleaApi {
  return {
    registerRitus: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    executeByRef: vi.fn().mockResolvedValue(undefined),
    executeBySystemId: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(true),
  };
}

function makeQueuedExecution(actorId = 'actor-1'): SequenceExecution {
  const ctx = makeRollContext({
    initiator: { id: actorId, name: 'Actor', system: {} },
  });
  const exec = SequenceExecution.create('exemplar-1', ctx);
  // status is 'queued' by default from create()
  return exec;
}

function makeSuspendedExecution(actorId = 'actor-1'): SequenceExecution {
  const exec = makeQueuedExecution(actorId);
  exec.suspend(Date.now());
  return exec;
}

// Boundary

describe('Combat Integration — Boundary', () => {
  it('combatTurn handler with no actorId in current data is a no-op', async () => {
    const api = makeApi();
    const store = new InMemoryCombatStateStore();
    const handler = makeCombatTurnHandler(api, store);

    await handler(null, {}); // no actorId
    expect(api.execute).not.toHaveBeenCalled();
  });

  it('combatTurn handler with null current data is a no-op', async () => {
    const api = makeApi();
    const store = new InMemoryCombatStateStore();
    const handler = makeCombatTurnHandler(api, store);

    await handler(null, null);
    expect(api.execute).not.toHaveBeenCalled();
  });

  it('combatRound handler on empty store is a no-op', async () => {
    const store = new InMemoryCombatStateStore();
    const handler = makeCombatRoundHandler(store);

    await handler(null); // should not throw
    expect(store.size()).toBe(0);
  });

  it('combatRound clears all queued entries when multiple exist', async () => {
    const store = new InMemoryCombatStateStore();
    const exec1 = makeQueuedExecution('actor-1');
    const exec2 = makeQueuedExecution('actor-2');
    await store.save(exec1);
    await store.save(exec2);

    const handler = makeCombatRoundHandler(store);
    await handler(null);

    expect(store.size()).toBe(0);
  });
});

// Scenario

describe('Combat Integration — Scenario', () => {
  it('queued sequence auto-executes on combatant turn', async () => {
    const api = makeApi();
    const store = new InMemoryCombatStateStore();
    const exec = makeQueuedExecution('actor-1');
    await store.save(exec);

    const handler = makeCombatTurnHandler(api, store);
    await handler(null, { actorId: 'actor-1' });

    expect(api.execute).toHaveBeenCalledOnce();
    expect(api.execute).toHaveBeenCalledWith(exec.context);
  });

  it('no queued sequence for actorId is a no-op', async () => {
    const api = makeApi();
    const store = new InMemoryCombatStateStore();
    // Store has entry for actor-2 but not actor-1
    const exec = makeQueuedExecution('actor-2');
    await store.save(exec);

    const handler = makeCombatTurnHandler(api, store);
    await handler(null, { actorId: 'actor-1' });

    expect(api.execute).not.toHaveBeenCalled();
  });

  it('suspended entry is not re-triggered on combatant turn', async () => {
    const api = makeApi();
    const store = new InMemoryCombatStateStore();
    const exec = makeSuspendedExecution('actor-1');
    await store.save(exec);

    const handler = makeCombatTurnHandler(api, store);
    await handler(null, { actorId: 'actor-1' });

    expect(api.execute).not.toHaveBeenCalled();
  });

  it('combatRound advance clears queued entries', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueuedExecution();
    await store.save(exec);

    const handler = makeCombatRoundHandler(store);
    await handler(null);

    expect(store.size()).toBe(0);
  });

  it('suspended entries survive combat round advance', async () => {
    const store = new InMemoryCombatStateStore();
    const suspended = makeSuspendedExecution('actor-1');
    await store.save(suspended);

    const handler = makeCombatRoundHandler(store);
    await handler(null);

    expect(store.size()).toBe(1);
    expect(store.has(suspended.sequenceId)).toBe(true);
  });
});

// Failure

describe('Combat Integration — Failure', () => {
  it('combatTurn handler with actorId that has no store entry does nothing', async () => {
    const api = makeApi();
    const store = new InMemoryCombatStateStore();

    const handler = makeCombatTurnHandler(api, store);
    await handler(null, { actorId: 'nobody' });

    expect(api.execute).not.toHaveBeenCalled();
  });

  it('combatTurn handler does not re-execute if status is "running"', async () => {
    const api = makeApi();
    const store = new InMemoryCombatStateStore();
    const exec = makeQueuedExecution('actor-1');
    exec.status = 'running'; // simulate in-progress
    await store.save(exec);

    const handler = makeCombatTurnHandler(api, store);
    await handler(null, { actorId: 'actor-1' });

    expect(api.execute).not.toHaveBeenCalled();
  });
});

// Combinatorial

describe('Combat Integration — Combinatorial', () => {
  it('mixed queued and suspended entries: round advance clears only queued', async () => {
    const store = new InMemoryCombatStateStore();
    const queued1 = makeQueuedExecution('actor-1');
    const queued2 = makeQueuedExecution('actor-2');
    const suspended1 = makeSuspendedExecution('actor-3');
    const suspended2 = makeSuspendedExecution('actor-4');

    await store.save(queued1);
    await store.save(queued2);
    await store.save(suspended1);
    await store.save(suspended2);

    const handler = makeCombatRoundHandler(store);
    await handler(null);

    expect(store.size()).toBe(2); // only suspended remain
    expect(store.has(queued1.sequenceId)).toBe(false);
    expect(store.has(queued2.sequenceId)).toBe(false);
    expect(store.has(suspended1.sequenceId)).toBe(true);
    expect(store.has(suspended2.sequenceId)).toBe(true);
  });

  it('SpyHookEmitter records all emitted hooks', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a', tier: 'hit' });
    emitter.emit('dtk-alea.complete', { sequenceId: 'seq-1' });
    emitter.emit('dtk-alea.step', { stepId: 'b', tier: 'miss' });

    expect(emitter.calls).toHaveLength(3);
    expect(emitter.callsFor('dtk-alea.step')).toHaveLength(2);
    expect(emitter.lastPayloadFor('dtk-alea.step')).toMatchObject({ stepId: 'b' });
    expect(emitter.payloadsFor('dtk-alea.complete')).toHaveLength(1);

    emitter.clear();
    expect(emitter.calls).toHaveLength(0);
  });

  it('DeterministicDiceRoller queues and dequeues in order', async () => {
    const roller = new DeterministicDiceRoller([[5, 6], [1, 2, 3]]);
    expect((await roller.roll(2, 6)).faces).toEqual([5, 6]);
    expect((await roller.roll(3, 6)).faces).toEqual([1, 2, 3]);
  });

  it('NullExpressionDelegate always returns null', () => {
    const delegate = new NullExpressionDelegate();
    expect(delegate.evaluate('anything', {} as any)).toBeNull();
    expect(delegate.evaluate('if(@x, 1, 2)', {} as any)).toBeNull();
  });

  it('InMemoryCombatStateStore save/load/delete round-trip', async () => {
    const store = new InMemoryCombatStateStore();
    const exec = makeQueuedExecution();

    await store.save(exec);
    expect(store.has(exec.sequenceId)).toBe(true);
    expect(store.size()).toBe(1);

    const loaded = await store.load(exec.sequenceId);
    expect(loaded).toBe(exec);

    await store.delete(exec.sequenceId);
    expect(store.size()).toBe(0);
    expect(await store.load(exec.sequenceId)).toBeNull();
  });
});
