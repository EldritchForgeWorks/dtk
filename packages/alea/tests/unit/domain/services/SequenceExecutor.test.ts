import { describe, it, expect, beforeEach } from 'vitest';
import { SequenceExecutor } from '../../../../src/domain/services/SequenceExecutor.js';
import { RollResolver } from '../../../../src/domain/services/RollResolver.js';
import { ExpressionParser } from '../../../../src/domain/services/ExpressionParser.js';
import { RitusRegistry } from '../../../../src/domain/services/RitusRegistry.js';
import { DeterministicDiceRoller } from '../../../../src/adapters/in-memory/DeterministicDiceRoller.js';
import { InMemoryCombatStateStore } from '../../../../src/adapters/in-memory/InMemoryCombatStateStore.js';
import { SpyHookEmitter } from '../../../../src/adapters/in-memory/SpyHookEmitter.js';
import { createAleaApi } from '../../../../src/AleaApi.js';
import {
  makeRollContext,
  makeRuleStep,
  makeAwaitStep,
  makeSequenceExemplar,
} from '../../../fixtures/exemplar.js';
import { makeSimpleRitus } from '../../../fixtures/ritus.js';
import type { RollContext } from '../../../../src/domain/entities/SequenceExecution.js';

interface TestHarness {
  roller: DeterministicDiceRoller;
  store: InMemoryCombatStateStore;
  emitter: SpyHookEmitter;
  registry: RitusRegistry;
  executor: SequenceExecutor;
}

function makeHarness(): TestHarness {
  const roller = new DeterministicDiceRoller();
  const store = new InMemoryCombatStateStore();
  const emitter = new SpyHookEmitter();
  const registry = new RitusRegistry();
  registry.register(makeSimpleRitus()); // id='simple', threshold=5, tiers={hit:1}
  const parser = new ExpressionParser();
  const resolver = new RollResolver(roller, parser);
  const executor = new SequenceExecutor(resolver, store, emitter, registry, parser);
  return { roller, store, emitter, registry, executor };
}

// makeRollContext() uses systemId='simple' and initiator.id='actor-1'
// makeSimpleRitus() threshold=5, tiers={hit:1}
// Dice [5,5,...] → hits at threshold 5; classify(n,{hit:1}) → 'hit' if n>=1, else 'miss'

function makeCtx(steps?: Parameters<typeof makeSequenceExemplar>[0], overrides?: Partial<RollContext>): RollContext {
  return makeRollContext({
    sequenceExemplar: makeSequenceExemplar(steps),
    ...overrides,
  });
}

// Boundary

describe('SequenceExecutor — Boundary', () => {
  it('empty step list emits dtk-alea.complete immediately', async () => {
    const { executor, emitter } = makeHarness();
    await executor.execute(makeCtx([]));
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(1);
    expect(emitter.callsFor('dtk-alea.step')).toHaveLength(0);
  });

  it('single-step sequence emits one step then complete', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([5, 5, 5]);
    await executor.execute(makeCtx([makeRuleStep({ id: 'only', pool: '3' })]));
    expect(emitter.callsFor('dtk-alea.step')).toHaveLength(1);
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(1);
  });

  it('store is empty after complete (delete called)', async () => {
    const { roller, executor, store } = makeHarness();
    roller.enqueue([5, 5]);
    await executor.execute(makeCtx([makeRuleStep({ id: 'r', pool: '2' })]));
    expect(store.size()).toBe(0);
  });
});

// Scenario

describe('SequenceExecutor — Scenario', () => {
  it('all steps execute in order', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([5, 5]); // step1
    roller.enqueue([5, 5]); // step2
    roller.enqueue([5, 5]); // step3
    await executor.execute(makeCtx([
      makeRuleStep({ id: 'step1', pool: '2' }),
      makeRuleStep({ id: 'step2', pool: '2' }),
      makeRuleStep({ id: 'step3', pool: '2' }),
    ]));
    const stepCalls = emitter.callsFor('dtk-alea.step');
    expect(stepCalls).toHaveLength(3);
    expect((stepCalls[0].payload as any).stepId).toBe('step1');
    expect((stepCalls[1].payload as any).stepId).toBe('step2');
    expect((stepCalls[2].payload as any).stepId).toBe('step3');
  });

  it('step with false condition is skipped (null output)', async () => {
    const { roller, executor, emitter } = makeHarness();
    // attack step: dice [1,1] → 0 hits vs threshold 5 → 'miss'
    roller.enqueue([1, 1]);
    // damage step has condition: attack.tier neq 'miss' → false → skip
    // no dice needed for skipped step
    await executor.execute(makeCtx([
      makeRuleStep({ id: 'attack', pool: '2' }),
      makeRuleStep({
        id: 'damage',
        pool: '2',
        condition: { field: '@steps.attack.tier', op: 'neq', value: 'miss' },
      }),
    ]));
    // Only attack step emits dtk-alea.step, damage is skipped
    const steps = emitter.callsFor('dtk-alea.step');
    expect(steps).toHaveLength(1);
    expect((steps[0].payload as any).stepId).toBe('attack');
  });

  it('skipped step does not block subsequent steps', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([1, 1]); // attack: 0 hits → miss
    // middle step will be skipped
    roller.enqueue([5, 5]); // cleanup step: 2 hits → hit
    await executor.execute(makeCtx([
      makeRuleStep({ id: 'attack', pool: '2' }),
      makeRuleStep({
        id: 'followup',
        pool: '2',
        condition: { field: '@steps.attack.tier', op: 'eq', value: 'hit' },
      }),
      makeRuleStep({ id: 'cleanup', pool: '2' }),
    ]));
    const steps = emitter.callsFor('dtk-alea.step');
    expect(steps).toHaveLength(2);
    expect((steps[0].payload as any).stepId).toBe('attack');
    expect((steps[1].payload as any).stepId).toBe('cleanup');
  });

  it('await step suspends execution: saves to store and emits dtk-alea.await', async () => {
    const { executor, store, emitter } = makeHarness();
    await executor.execute(makeCtx([
      makeAwaitStep({ id: 'choice', choices: ['dodge', 'block'] }),
      makeRuleStep({ id: 'result', pool: '2' }),
    ]));
    expect(emitter.callsFor('dtk-alea.await')).toHaveLength(1);
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(0);
    expect(store.size()).toBe(1);
  });

  it('await step emits correct payload', async () => {
    const { executor, emitter } = makeHarness();
    await executor.execute(makeCtx([
      makeAwaitStep({ id: 'choice', choices: ['dodge', 'block'], timeout: 30 }),
    ]));
    const payload = emitter.lastPayloadFor('dtk-alea.await') as any;
    expect(payload.stepId).toBe('choice');
    expect(payload.choices).toEqual(['dodge', 'block']);
    expect(payload.timeout).toBe(30);
    expect(payload.actorId).toBe('actor-1');
    expect(payload.sequenceId).toBeDefined();
  });

  it('resume continues from the step after await with the provided choice', async () => {
    const { roller, executor, emitter } = makeHarness();
    // First: execute with await step
    await executor.execute(makeCtx([
      makeAwaitStep({ id: 'decision', choices: ['yes', 'no'] }),
      makeRuleStep({ id: 'after', pool: '2' }),
    ]));
    // Get sequenceId from await payload
    const awaitPayload = emitter.lastPayloadFor('dtk-alea.await') as any;
    const { sequenceId } = awaitPayload;

    // Resume with 'yes'
    roller.enqueue([5, 5]);
    await executor.resume(sequenceId, 'yes');

    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(1);
    const completePayload = emitter.lastPayloadFor('dtk-alea.complete') as any;
    expect(completePayload.stepOutputs['decision.choice']).toBe('yes');
  });

  it('resume with null choice (timeout) records null and continues', async () => {
    const { roller, executor, emitter } = makeHarness();
    await executor.execute(makeCtx([
      makeAwaitStep({ id: 'timeout', choices: ['act'] }),
      makeRuleStep({ id: 'aftermath', pool: '2' }),
    ]));
    const { sequenceId } = emitter.lastPayloadFor('dtk-alea.await') as any;

    roller.enqueue([5, 5]);
    await executor.resume(sequenceId, null);

    const completePayload = emitter.lastPayloadFor('dtk-alea.complete') as any;
    expect(completePayload.stepOutputs['timeout.choice']).toBeNull();
  });

  it('miss tier with no on_tier is a no-op (no damage in payload)', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([1, 1, 1, 1]); // 0 hits → miss (pool > 0, tiers={hit:1} → 'miss')
    await executor.execute(makeCtx([
      makeRuleStep({ id: 'attack', pool: '4' }), // no on_tier
    ]));
    const stepPayload = emitter.lastPayloadFor('dtk-alea.step') as any;
    expect(stepPayload.tier).toBe('miss');
    expect(stepPayload.damage).toBeUndefined();
    expect(stepPayload.effect).toBeUndefined();
  });

  it('hit tier applies damage formula from on_tier', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([5, 5, 5, 5]); // 4 hits, threshold=5 → classify(4,{hit:1})='hit'
    await executor.execute(makeCtx([
      makeRuleStep({
        id: 'attack',
        pool: '4',
        on_tier: { hit: { damage: '5' } },
      }),
    ]));
    const payload = emitter.lastPayloadFor('dtk-alea.step') as any;
    expect(payload.tier).toBe('hit');
    expect(payload.damage).toBe(5);
  });

  it('on_tier effect is included in step payload', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([5, 5]);
    await executor.execute(makeCtx([
      makeRuleStep({
        id: 'shock',
        pool: '2',
        on_tier: { hit: { effect: 'stun-effect', message: 'Stunned!' } },
      }),
    ]));
    const payload = emitter.lastPayloadFor('dtk-alea.step') as any;
    expect(payload.effect).toBe('stun-effect');
    expect(payload.message).toBe('Stunned!');
  });

  it('dtk-alea.complete fires after last step with stepOutputs', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([5, 5]);
    await executor.execute(makeCtx([makeRuleStep({ id: 'final', pool: '2' })]));
    const payload = emitter.lastPayloadFor('dtk-alea.complete') as any;
    expect(payload).toBeDefined();
    expect(payload.stepOutputs).toBeDefined();
    expect(payload.stepOutputs['final']).toBeDefined();
  });

  it('dtk-alea.complete does not fire during suspension', async () => {
    const { executor, emitter } = makeHarness();
    await executor.execute(makeCtx([
      makeAwaitStep({ id: 'wait', choices: ['go'] }),
    ]));
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(0);
  });
});

// Failure

describe('SequenceExecutor — Failure', () => {
  it('resume with unknown sequenceId warns and does nothing', async () => {
    const { executor, emitter } = makeHarness();
    // Should not throw
    await executor.resume('nonexistent-id', 'something');
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(0);
  });

  it('step with unregistered systemId during execute does not crash', async () => {
    const { roller, executor } = makeHarness();
    roller.enqueue([5, 5]);
    const ctx = makeRollContext({
      systemId: 'unregistered',
      sequenceExemplar: makeSequenceExemplar([makeRuleStep({ id: 'r', pool: '2' })]),
    });
    // Should throw because RitusRegistry.resolve throws on unknown systemId
    await expect(executor.execute(ctx)).rejects.toThrow();
  });
});

// Combinatorial

describe('SequenceExecutor — Combinatorial', () => {
  it('condition + await + on_tier consequence in same sequence', async () => {
    const { roller, executor, emitter } = makeHarness();
    // Step 1: attack (conditional always-pass: no condition)
    roller.enqueue([5, 5, 5, 5]); // 4 hits → 'hit'
    // Step 2: await (conditional: attack.tier neq 'miss')
    // Step 3: damage (runs after resume)
    roller.enqueue([5, 5]); // damage dice
    await executor.execute(makeCtx([
      makeRuleStep({ id: 'attack', pool: '4' }),
      makeAwaitStep({
        id: 'decision',
        choices: ['dodge', 'tank'],
        condition: { field: '@steps.attack.tier', op: 'neq', value: 'miss' },
      }),
      makeRuleStep({ id: 'damage', pool: '2', on_tier: { hit: { damage: '3' } } }),
    ]));

    // attack ran, then await suspended (because attack.tier='hit' != 'miss')
    expect(emitter.callsFor('dtk-alea.step')).toHaveLength(1);
    expect(emitter.callsFor('dtk-alea.await')).toHaveLength(1);

    const { sequenceId } = emitter.lastPayloadFor('dtk-alea.await') as any;
    await executor.resume(sequenceId, 'tank');

    // After resume: damage step runs
    expect(emitter.callsFor('dtk-alea.step')).toHaveLength(2);
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(1);
    const completePayload = emitter.lastPayloadFor('dtk-alea.complete') as any;
    expect(completePayload.stepOutputs['decision.choice']).toBe('tank');
  });

  it('chain roll result is stored in stepOutputs under stepId.chain', async () => {
    const { roller, executor, emitter } = makeHarness();
    roller.enqueue([5, 5, 5, 5]); // main roll: 4 hits → 'hit'
    roller.enqueue([5, 5]);        // chain roll
    await executor.execute(makeCtx([
      makeRuleStep({
        id: 'attack',
        pool: '4',
        on_tier: { hit: { chain: { pool: '2', mechanic: 'pool' } } },
      }),
    ]));
    const payload = emitter.lastPayloadFor('dtk-alea.complete') as any;
    expect(payload.stepOutputs['attack.chain']).toBeDefined();
  });

  it('createAleaApi delegates execute and resume correctly', async () => {
    const { roller, store, emitter, registry } = makeHarness();
    const parser = new ExpressionParser();
    const resolver = new RollResolver(roller, parser);
    const executor = new SequenceExecutor(resolver, store, emitter, registry, parser);
    const readyFlag = { value: true };
    const api = createAleaApi(registry, executor, readyFlag);

    expect(api.isReady()).toBe(true);

    roller.enqueue([5, 5]);
    await api.execute(makeCtx([makeRuleStep({ id: 'step', pool: '2' })]));
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(1);
  });

  it('createAleaApi.registerRitus delegates to registry', () => {
    const { store, emitter, registry } = makeHarness();
    const parser = new ExpressionParser();
    const roller = new DeterministicDiceRoller();
    const resolver = new RollResolver(roller, parser);
    const executor = new SequenceExecutor(resolver, store, emitter, registry, parser);
    const api = createAleaApi(registry, executor, { value: false });

    api.registerRitus({ id: 'new-system', mechanic: 'pool', threshold: 4, tiers: { hit: 1 } });
    expect(registry.get('new-system')).not.toBeNull();
  });
});
