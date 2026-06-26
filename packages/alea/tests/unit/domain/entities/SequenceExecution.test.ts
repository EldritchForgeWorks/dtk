import { describe, it, expect, beforeEach } from 'vitest';
import { SequenceExecution } from '../../../../src/domain/entities/SequenceExecution.js';
import type { SequenceExecutionSnapshot } from '../../../../src/domain/entities/SequenceExecution.js';
import { makeRollContext } from '../../../fixtures/exemplar.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides?: Partial<SequenceExecutionSnapshot>): SequenceExecutionSnapshot {
  return {
    sequenceId: 'seq-abc',
    exemplarId: 'exemplar-1',
    stepIndex: 0,
    stepOutputs: {},
    context: makeRollContext(),
    status: 'queued',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Boundary
// ---------------------------------------------------------------------------

describe('SequenceExecution — Boundary', () => {
  it('creates with stepIndex=0 and empty stepOutputs', () => {
    const ctx = makeRollContext();
    const exec = SequenceExecution.create('exemplar-1', ctx);

    expect(exec.stepIndex).toBe(0);
    expect(exec.stepOutputsRecord).toEqual({});
    expect(exec.status).toBe('queued');
  });

  it('create() generates a non-empty sequenceId', () => {
    const exec = SequenceExecution.create('exemplar-1', makeRollContext());
    expect(typeof exec.sequenceId).toBe('string');
    expect(exec.sequenceId.length).toBeGreaterThan(0);
  });

  it('create() generates a unique sequenceId each time', () => {
    const ctx = makeRollContext();
    const a = SequenceExecution.create('ex', ctx);
    const b = SequenceExecution.create('ex', ctx);
    expect(a.sequenceId).not.toBe(b.sequenceId);
  });

  it('advance() increments stepIndex from 0 to 1', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.advance();
    expect(exec.stepIndex).toBe(1);
  });

  it('getStepOutput returns undefined for an unstored stepId', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    expect(exec.getStepOutput('nonexistent')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

describe('SequenceExecution — Scenario', () => {
  it('create() stores exemplarId and context', () => {
    const ctx = makeRollContext();
    const exec = SequenceExecution.create('exemplar-42', ctx);

    expect(exec.exemplarId).toBe('exemplar-42');
    expect(exec.context).toBe(ctx);
  });

  it('recordStepOutput stores output and is retrievable via getStepOutput', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    const result = { hits: 3, opposedHits: null, netHits: 3, tier: 'hit', faces: [5, 6, 3], pool: 6 };
    exec.recordStepOutput('attack', result);

    expect(exec.getStepOutput('attack')).toEqual(result);
  });

  it('recordStepOutput with null stores null sentinel (skipped step)', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.recordStepOutput('skipped-step', null);

    expect(exec.getStepOutput('skipped-step')).toBeNull();
  });

  it('recordChoice stores choice under stepId + ".choice"', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.recordChoice('choice-1', 'dodge');

    expect(exec.getStepOutput('choice-1.choice')).toBe('dodge');
  });

  it('recordChoice stores null for timeout choice', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.recordChoice('choice-1', null);

    expect(exec.getStepOutput('choice-1.choice')).toBeNull();
  });

  it('suspend() sets status to "suspended" and records suspendedAt', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    const ts = Date.now();
    exec.suspend(ts);

    expect(exec.status).toBe('suspended');
    expect(exec.suspendedAt).toBe(ts);
  });

  it('resume() sets status to "running" and clears suspendedAt', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.suspend(Date.now());
    exec.resume();

    expect(exec.status).toBe('running');
    expect(exec.suspendedAt).toBeUndefined();
  });

  it('complete() sets status to "complete"', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.complete();

    expect(exec.status).toBe('complete');
  });

  it('toSnapshot() round-trips via fromSnapshot()', () => {
    const ctx = makeRollContext();
    const original = SequenceExecution.create('exemplar-1', ctx);
    original.recordStepOutput('step-a', { hits: 2, opposedHits: null, netHits: 2, tier: 'hit', faces: [5, 6], pool: 4 });
    original.advance();

    const snapshot = original.toSnapshot();
    const restored = SequenceExecution.fromSnapshot(snapshot);

    expect(restored.sequenceId).toBe(original.sequenceId);
    expect(restored.exemplarId).toBe(original.exemplarId);
    expect(restored.stepIndex).toBe(original.stepIndex);
    expect(restored.status).toBe(original.status);
    expect(restored.getStepOutput('step-a')).toEqual(original.getStepOutput('step-a'));
  });

  it('toSnapshot() returns a plain object (no class methods)', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    const snap = exec.toSnapshot();

    expect(snap).toHaveProperty('sequenceId');
    expect(snap).toHaveProperty('exemplarId');
    expect(snap).toHaveProperty('stepIndex');
    expect(snap).toHaveProperty('stepOutputs');
    expect(snap).toHaveProperty('context');
    expect(snap).toHaveProperty('status');
    expect(typeof snap.stepOutputs).toBe('object');
  });

  it('stepOutputsRecord reflects all recorded outputs as plain record', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.recordStepOutput('step-a', null);
    exec.recordStepOutput('step-b', { hits: 1, opposedHits: null, netHits: 1, tier: 'glancing', faces: [5], pool: 3 });

    const rec = exec.stepOutputsRecord;
    expect(rec['step-a']).toBeNull();
    expect(rec['step-b']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Failure
// ---------------------------------------------------------------------------

describe('SequenceExecution — Failure', () => {
  it('fromSnapshot() throws when sequenceId is missing', () => {
    const snap = makeSnapshot();
    // @ts-expect-error intentional invalid input
    delete snap.sequenceId;

    expect(() => SequenceExecution.fromSnapshot(snap as SequenceExecutionSnapshot)).toThrow();
  });

  it('fromSnapshot() throws when context is missing', () => {
    const snap = makeSnapshot();
    // @ts-expect-error intentional invalid input
    delete snap.context;

    expect(() => SequenceExecution.fromSnapshot(snap as SequenceExecutionSnapshot)).toThrow();
  });

  it('fromSnapshot() throws when status is missing', () => {
    const snap = makeSnapshot();
    // @ts-expect-error intentional invalid input
    delete snap.status;

    expect(() => SequenceExecution.fromSnapshot(snap as SequenceExecutionSnapshot)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Combinatorial
// ---------------------------------------------------------------------------

describe('SequenceExecution — Combinatorial', () => {
  it('record + advance + suspend + resume + complete lifecycle is coherent', () => {
    const exec = SequenceExecution.create('exemplar-life', makeRollContext());
    expect(exec.status).toBe('queued');

    exec.recordStepOutput('step-0', null);
    exec.advance();
    expect(exec.stepIndex).toBe(1);

    exec.suspend(1000);
    expect(exec.status).toBe('suspended');
    expect(exec.suspendedAt).toBe(1000);

    exec.recordChoice('await-step', 'dodge');
    exec.resume();
    expect(exec.status).toBe('running');
    expect(exec.suspendedAt).toBeUndefined();

    exec.advance();
    exec.recordStepOutput('step-1', { hits: 4, opposedHits: 1, netHits: 3, tier: 'critical', faces: [5,6,6,5], pool: 8 });

    exec.complete();
    expect(exec.status).toBe('complete');
    expect(exec.stepIndex).toBe(2);
    expect(exec.getStepOutput('step-1')).toBeDefined();
    expect(exec.getStepOutput('await-step.choice')).toBe('dodge');
  });

  it('toSnapshot → fromSnapshot preserves suspended state', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.suspend(9999);

    const restored = SequenceExecution.fromSnapshot(exec.toSnapshot());
    expect(restored.status).toBe('suspended');
    expect(restored.suspendedAt).toBe(9999);
  });

  it('toSnapshot → fromSnapshot preserves multiple step outputs', () => {
    const exec = SequenceExecution.create('ex', makeRollContext());
    exec.recordStepOutput('s1', null);
    exec.recordStepOutput('s2', { hits: 2, opposedHits: null, netHits: 2, tier: 'hit', faces: [5,6], pool: 4 });
    exec.recordChoice('await-1', 'yes');

    const restored = SequenceExecution.fromSnapshot(exec.toSnapshot());
    expect(restored.getStepOutput('s1')).toBeNull();
    expect(restored.getStepOutput('s2')).toBeDefined();
    expect(restored.getStepOutput('await-1.choice')).toBe('yes');
  });
});
