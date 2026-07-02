import { describe, it, expect, vi } from 'vitest';
import { SequenceExemplarRegistry } from '../../../../src/domain/services/SequenceExemplarRegistry.js';
import type { SequenceExemplar } from '../../../../src/domain/entities/SequenceExecution.js';

function makeExemplar(overrides?: Partial<SequenceExemplar>): SequenceExemplar {
  return {
    id: 'test-exemplar',
    systemId: 'sr5e',
    steps: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Boundary
// ---------------------------------------------------------------------------

describe('SequenceExemplarRegistry — Boundary', () => {
  it('empty registry returns null for any UUID', () => {
    const registry = new SequenceExemplarRegistry();
    expect(registry.getByUUID('any-uuid')).toBeNull();
  });

  it('empty UUID string returns null without throwing', () => {
    const registry = new SequenceExemplarRegistry();
    expect(registry.getByUUID('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

describe('SequenceExemplarRegistry — Scenario', () => {
  it('register then getByUUID returns the registered exemplar', () => {
    const registry = new SequenceExemplarRegistry();
    const exemplar = makeExemplar();
    registry.register('uuid-1', exemplar);
    expect(registry.getByUUID('uuid-1')).toBe(exemplar);
  });

  it('all() returns all registered exemplars', () => {
    const registry = new SequenceExemplarRegistry();
    const a = makeExemplar({ id: 'a' });
    const b = makeExemplar({ id: 'b' });
    registry.register('uuid-a', a);
    registry.register('uuid-b', b);
    expect(registry.all().size).toBe(2);
    expect(registry.all().get('uuid-a')).toBe(a);
    expect(registry.all().get('uuid-b')).toBe(b);
  });

  it('register same UUID twice warns and overwrites', () => {
    const registry = new SequenceExemplarRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = makeExemplar({ id: 'first' });
    const second = makeExemplar({ id: 'second' });
    registry.register('uuid-1', first);
    registry.register('uuid-1', second);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(registry.getByUUID('uuid-1')).toBe(second);
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Failure
// ---------------------------------------------------------------------------

describe('SequenceExemplarRegistry — Failure', () => {
  it('getByUUID with unregistered UUID returns null without throwing', () => {
    const registry = new SequenceExemplarRegistry();
    registry.register('uuid-1', makeExemplar());
    expect(registry.getByUUID('unknown-uuid')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Combinatorial
// ---------------------------------------------------------------------------

describe('SequenceExemplarRegistry — Combinatorial', () => {
  it('registering multiple exemplars: all() count matches', () => {
    const registry = new SequenceExemplarRegistry();
    const count = 5;
    for (let i = 0; i < count; i++) {
      registry.register(`uuid-${i}`, makeExemplar({ id: `exemplar-${i}` }));
    }
    expect(registry.all().size).toBe(count);
  });
});
