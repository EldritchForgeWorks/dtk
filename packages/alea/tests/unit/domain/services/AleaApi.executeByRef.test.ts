import { describe, it, expect, vi } from 'vitest';
import { createAleaApi } from '../../../../src/AleaApi.js';
import { SequenceExemplarRegistry } from '../../../../src/domain/services/SequenceExemplarRegistry.js';
import { InMemoryActorRepository } from '../../../../src/adapters/in-memory/InMemoryActorRepository.js';
import type { SequenceExemplar, RollContext } from '../../../../src/domain/entities/SequenceExecution.js';
import type { ActorSnapshot } from '../../../../src/ports/IExpressionDelegate.js';
import type { SequenceExecutor } from '../../../../src/domain/services/SequenceExecutor.js';

function makeExemplar(overrides?: Partial<SequenceExemplar>): SequenceExemplar {
  return {
    id: 'test-exemplar',
    systemId: 'sr5e',
    steps: [],
    ...overrides,
  };
}

function makeActor(overrides?: Partial<ActorSnapshot>): ActorSnapshot {
  return {
    id: 'actor-1',
    name: 'Test Actor',
    system: {},
    ...overrides,
  };
}

function setup() {
  const exemplarRegistry = new SequenceExemplarRegistry();
  const actorRepository = new InMemoryActorRepository();
  const executeSpy = vi.fn<(context: RollContext) => Promise<void>>().mockResolvedValue(undefined);
  const executor = { execute: executeSpy } as unknown as SequenceExecutor;
  const registry = {} as never;
  const readyFlag = { value: true };
  const api = createAleaApi(registry, executor, readyFlag, exemplarRegistry, actorRepository);
  return { api, exemplarRegistry, actorRepository, executeSpy };
}

// Boundary

describe('AleaApi.executeByRef — Boundary', () => {
  it('empty targetIds array produces an empty targets array', async () => {
    const { api, exemplarRegistry, actorRepository, executeSpy } = setup();
    exemplarRegistry.register('uuid-1', makeExemplar());
    actorRepository.set(makeActor());

    await api.executeByRef('uuid-1', 'actor-1', []);

    const context = executeSpy.mock.calls[0]?.[0] as RollContext;
    expect(context.targets).toEqual([]);
  });
});

// Scenario

describe('AleaApi.executeByRef — Scenario', () => {
  it('valid UUID + valid actorId calls the executor', async () => {
    const { api, exemplarRegistry, actorRepository, executeSpy } = setup();
    exemplarRegistry.register('uuid-1', makeExemplar());
    actorRepository.set(makeActor());

    await api.executeByRef('uuid-1', 'actor-1', []);

    expect(executeSpy).toHaveBeenCalledOnce();
  });

  it('builds a RollContext with the right initiator and sequenceExemplar', async () => {
    const { api, exemplarRegistry, actorRepository, executeSpy } = setup();
    const exemplar = makeExemplar({ id: 'fireball', systemId: 'dnd5e' });
    const actor = makeActor({ id: 'mage', name: 'Gandalf' });
    exemplarRegistry.register('uuid-fireball', exemplar);
    actorRepository.set(actor);

    await api.executeByRef('uuid-fireball', 'mage', []);

    const context = executeSpy.mock.calls[0]?.[0] as RollContext;
    expect(context.systemId).toBe('dnd5e');
    expect(context.sequenceExemplarId).toBe('fireball');
    expect(context.sequenceExemplar).toBe(exemplar);
    expect(context.initiator).toBe(actor);
    expect(context.item).toBeNull();
    expect(context.combat).toBeNull();
  });

  it('maps targetIds to ActorSnapshot[] in order', async () => {
    const { api, exemplarRegistry, actorRepository, executeSpy } = setup();
    exemplarRegistry.register('uuid-1', makeExemplar());
    const initiator = makeActor({ id: 'initiator' });
    const t1 = makeActor({ id: 'target-1', name: 'Goblin A' });
    const t2 = makeActor({ id: 'target-2', name: 'Goblin B' });
    actorRepository.set(initiator);
    actorRepository.set(t1);
    actorRepository.set(t2);

    await api.executeByRef('uuid-1', 'initiator', ['target-1', 'target-2']);

    const context = executeSpy.mock.calls[0]?.[0] as RollContext;
    expect(context.targets).toEqual([t1, t2]);
  });
});

// Failure

describe('AleaApi.executeByRef — Failure', () => {
  it('unknown UUID throws an error mentioning the UUID', async () => {
    const { api, actorRepository, executeSpy } = setup();
    actorRepository.set(makeActor());

    await expect(api.executeByRef('missing-uuid', 'actor-1', [])).rejects.toThrow(/missing-uuid/);
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('unknown actorId throws an error mentioning the actorId', async () => {
    const { api, exemplarRegistry, executeSpy } = setup();
    exemplarRegistry.register('uuid-1', makeExemplar());

    await expect(api.executeByRef('uuid-1', 'ghost-actor', [])).rejects.toThrow(/ghost-actor/);
    expect(executeSpy).not.toHaveBeenCalled();
  });
});

// Combinatorial

describe('AleaApi.executeByRef — Combinatorial', () => {
  it('unknown target IDs are filtered out silently', async () => {
    const { api, exemplarRegistry, actorRepository, executeSpy } = setup();
    exemplarRegistry.register('uuid-1', makeExemplar());
    const initiator = makeActor({ id: 'initiator' });
    const known = makeActor({ id: 'known-target' });
    actorRepository.set(initiator);
    actorRepository.set(known);

    await api.executeByRef('uuid-1', 'initiator', ['known-target', 'unknown-target', 'another-ghost']);

    const context = executeSpy.mock.calls[0]?.[0] as RollContext;
    expect(context.targets).toEqual([known]);
  });

  it('all unknown target IDs produce an empty targets array', async () => {
    const { api, exemplarRegistry, actorRepository, executeSpy } = setup();
    exemplarRegistry.register('uuid-1', makeExemplar());
    actorRepository.set(makeActor({ id: 'initiator' }));

    await api.executeByRef('uuid-1', 'initiator', ['ghost-1', 'ghost-2']);

    const context = executeSpy.mock.calls[0]?.[0] as RollContext;
    expect(context.targets).toEqual([]);
  });
});
