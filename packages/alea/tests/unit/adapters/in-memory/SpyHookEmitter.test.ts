import { describe, it, expect } from 'vitest';
import { SpyHookEmitter } from '../../../../src/adapters/in-memory/SpyHookEmitter.js';

// Boundary

describe('SpyHookEmitter — Boundary', () => {
  it('starts with an empty calls array', () => {
    const emitter = new SpyHookEmitter();
    expect(emitter.calls).toHaveLength(0);
  });

  it('callsFor() on empty emitter returns []', () => {
    const emitter = new SpyHookEmitter();
    expect(emitter.callsFor('dtk-alea.step')).toEqual([]);
  });

  it('payloadsFor() on empty emitter returns []', () => {
    const emitter = new SpyHookEmitter();
    expect(emitter.payloadsFor('dtk-alea.step')).toEqual([]);
  });

  it('lastPayloadFor() on empty emitter returns undefined', () => {
    const emitter = new SpyHookEmitter();
    expect(emitter.lastPayloadFor('dtk-alea.step')).toBeUndefined();
  });

  it('single emit records one call', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a' });
    expect(emitter.calls).toHaveLength(1);
  });

  it('emit records the correct hookName and payload', () => {
    const emitter = new SpyHookEmitter();
    const payload = { stepId: 'x', tier: 'hit' };
    emitter.emit('dtk-alea.step', payload);
    expect(emitter.calls[0].name).toBe('dtk-alea.step');
    expect(emitter.calls[0].payload).toBe(payload);
  });
});

// Scenario

describe('SpyHookEmitter — Scenario', () => {
  it('callsFor() filters to only the named hook', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a' });
    emitter.emit('dtk-alea.complete', { sequenceId: 's1' });
    emitter.emit('dtk-alea.step', { stepId: 'b' });

    expect(emitter.callsFor('dtk-alea.step')).toHaveLength(2);
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(1);
  });

  it('payloadsFor() returns just the payload objects for a named hook', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a', tier: 'hit' });
    emitter.emit('dtk-alea.step', { stepId: 'b', tier: 'miss' });

    const payloads = emitter.payloadsFor('dtk-alea.step');
    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toMatchObject({ stepId: 'a' });
    expect(payloads[1]).toMatchObject({ stepId: 'b' });
  });

  it('lastPayloadFor() returns the most recently emitted payload for that hook', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'first' });
    emitter.emit('dtk-alea.step', { stepId: 'last' });

    expect(emitter.lastPayloadFor('dtk-alea.step')).toMatchObject({ stepId: 'last' });
  });

  it('clear() resets calls to empty', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a' });
    emitter.emit('dtk-alea.complete', { sequenceId: 's1' });
    emitter.clear();

    expect(emitter.calls).toHaveLength(0);
  });

  it('callsFor() returns [] for a hookName that was never emitted', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a' });
    expect(emitter.callsFor('dtk-alea.await')).toEqual([]);
  });

  it('lastPayloadFor() returns undefined for a hookName never emitted', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a' });
    expect(emitter.lastPayloadFor('dtk-alea.complete')).toBeUndefined();
  });

  it('calls preserves insertion order across different hook names', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: '1' });
    emitter.emit('dtk-alea.await', { stepId: '2' });
    emitter.emit('dtk-alea.step', { stepId: '3' });
    emitter.emit('dtk-alea.complete', { sequenceId: 's' });

    expect(emitter.calls.map((c) => c.name)).toEqual([
      'dtk-alea.step',
      'dtk-alea.await',
      'dtk-alea.step',
      'dtk-alea.complete',
    ]);
  });
});

// Failure

describe('SpyHookEmitter — Failure', () => {
  it('callsFor() with unknown hookName returns [] without throwing', () => {
    const emitter = new SpyHookEmitter();
    expect(() => emitter.callsFor('no-such-hook')).not.toThrow();
    expect(emitter.callsFor('no-such-hook')).toEqual([]);
  });

  it('lastPayloadFor() with unknown hookName returns undefined without throwing', () => {
    const emitter = new SpyHookEmitter();
    expect(() => emitter.lastPayloadFor('no-such-hook')).not.toThrow();
    expect(emitter.lastPayloadFor('no-such-hook')).toBeUndefined();
  });

  it('clear() on already-empty emitter is a no-op', () => {
    const emitter = new SpyHookEmitter();
    expect(() => emitter.clear()).not.toThrow();
    expect(emitter.calls).toHaveLength(0);
  });

  it('emit accepts null payload without throwing', () => {
    const emitter = new SpyHookEmitter();
    expect(() => emitter.emit('dtk-alea.step', null)).not.toThrow();
    expect(emitter.calls[0].payload).toBeNull();
  });
});

// Combinatorial

describe('SpyHookEmitter — Combinatorial', () => {
  it('emit, callsFor, clear, re-emit works correctly', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'a' });
    emitter.emit('dtk-alea.complete', { sequenceId: 's1' });

    expect(emitter.calls).toHaveLength(2);
    emitter.clear();
    expect(emitter.calls).toHaveLength(0);

    emitter.emit('dtk-alea.step', { stepId: 'b' });
    expect(emitter.calls).toHaveLength(1);
    expect(emitter.lastPayloadFor('dtk-alea.step')).toMatchObject({ stepId: 'b' });
  });

  it('multiple hooks: payloadsFor and lastPayloadFor operate independently', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'step-1', tier: 'hit' });
    emitter.emit('dtk-alea.await', { stepId: 'wait-1', choices: ['yes', 'no'] });
    emitter.emit('dtk-alea.step', { stepId: 'step-2', tier: 'miss' });
    emitter.emit('dtk-alea.complete', { sequenceId: 'seq-1', stepOutputs: {} });

    expect(emitter.payloadsFor('dtk-alea.step')).toHaveLength(2);
    expect(emitter.payloadsFor('dtk-alea.await')).toHaveLength(1);
    expect(emitter.lastPayloadFor('dtk-alea.step')).toMatchObject({ stepId: 'step-2' });
    expect(emitter.lastPayloadFor('dtk-alea.await')).toMatchObject({ stepId: 'wait-1' });
    expect(emitter.lastPayloadFor('dtk-alea.complete')).toMatchObject({ sequenceId: 'seq-1' });
    expect(emitter.calls).toHaveLength(4);
  });

  it('callsFor returns calls in insertion order for a specific hook', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'alpha' });
    emitter.emit('dtk-alea.complete', { sequenceId: 's1' });
    emitter.emit('dtk-alea.step', { stepId: 'beta' });
    emitter.emit('dtk-alea.step', { stepId: 'gamma' });

    const stepCalls = emitter.callsFor('dtk-alea.step');
    expect(stepCalls).toHaveLength(3);
    expect((stepCalls[0].payload as any).stepId).toBe('alpha');
    expect((stepCalls[1].payload as any).stepId).toBe('beta');
    expect((stepCalls[2].payload as any).stepId).toBe('gamma');
  });

  it('after clear, previously seen hooks report as empty', () => {
    const emitter = new SpyHookEmitter();
    emitter.emit('dtk-alea.step', { stepId: 'x' });
    emitter.emit('dtk-alea.complete', { sequenceId: 'seq-x' });

    emitter.clear();

    expect(emitter.callsFor('dtk-alea.step')).toHaveLength(0);
    expect(emitter.callsFor('dtk-alea.complete')).toHaveLength(0);
    expect(emitter.lastPayloadFor('dtk-alea.step')).toBeUndefined();
  });
});
