import { describe, it, expect, vi } from 'vitest';
import { RollResolver } from '../../../../src/domain/services/RollResolver.js';
import { ExpressionParser } from '../../../../src/domain/services/ExpressionParser.js';
import { classify } from '../../../../src/domain/services/TierResolver.js';
import { DeterministicDiceRoller } from '../../../../src/adapters/in-memory/DeterministicDiceRoller.js';
import type { EvaluationContext } from '../../../../src/ports/IExpressionDelegate.js';
import { buildBareEvalContext } from '../../../helpers/buildContext.js';

const SR5E_TIERS = { critical: 4, hit: 1, glancing: 0 };
const SR5E_RITUS = { id: 'sr5e', mechanic: 'pool', threshold: 5, tiers: SR5E_TIERS };

function makeCtx(overrides?: Partial<EvaluationContext>): EvaluationContext {
  return buildBareEvalContext(overrides);
}

function makeResolver(sequences?: number[][]): { resolver: RollResolver; roller: DeterministicDiceRoller } {
  const roller = new DeterministicDiceRoller(sequences);
  const parser = new ExpressionParser();
  const resolver = new RollResolver(roller, parser);
  return { resolver, roller };
}

// TierResolver — pure function tests

describe('TierResolver — classify', () => {
  it('returns "critical" when net hits exceed critical threshold', () => {
    expect(classify(5, SR5E_TIERS)).toBe('critical');
  });

  it('returns "critical" at the exact critical threshold', () => {
    expect(classify(4, SR5E_TIERS)).toBe('critical');
  });

  it('returns "hit" when in the hit band', () => {
    expect(classify(2, SR5E_TIERS)).toBe('hit');
  });

  it('returns "hit" at exactly the hit threshold', () => {
    expect(classify(1, SR5E_TIERS)).toBe('hit');
  });

  it('returns "glancing" when net hits = 0 and glancing threshold = 0', () => {
    expect(classify(0, SR5E_TIERS)).toBe('glancing');
  });

  it('returns "miss" when no tier matches (no glancing tier, 0 net hits)', () => {
    expect(classify(0, { hit: 1 })).toBe('miss');
  });

  it('returns "miss" for empty tiers map', () => {
    expect(classify(3, {})).toBe('miss');
  });

  it('returns the single configured tier when netHits meets it', () => {
    expect(classify(2, { success: 1 })).toBe('success');
  });
});

// Boundary

describe('RollResolver — Boundary', () => {
  it('pool = 0 produces zero faces, zero hits, and tier "miss"', () => {
    const { resolver } = makeResolver();
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(0);
    expect(result.faces).toEqual([]);
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });

  it('pool = 1 rolls exactly one die', () => {
    const { resolver } = makeResolver([[5]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(1);
    expect(result.faces).toHaveLength(1);
  });

  it('all faces below threshold produces zero hits', () => {
    const { resolver } = makeResolver([[1, 2, 3, 4]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      { ...SR5E_RITUS, tiers: { hit: 1 } },
    );
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });

  it('all faces at or above threshold count as hits', () => {
    const { resolver } = makeResolver([[5, 6, 5, 6]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(4);
  });
});

// Scenario

describe('RollResolver — Scenario', () => {
  it('pool expression resolves via ExpressionParser (literal)', () => {
    const { resolver } = makeResolver([[5, 5, 5, 5, 5, 5]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '6' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(6);
    expect(result.faces).toHaveLength(6);
  });

  it('pool expression resolves via ExpressionParser (@initiator reference)', () => {
    // initiator.system.agility = 4
    const { resolver } = makeResolver([[5, 5, 5, 5]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '@initiator.system.agility' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(4);
    expect(result.faces).toHaveLength(4);
  });

  it('hits counted correctly (faces >= threshold)', () => {
    // threshold=5: [6,5,3,1,5] → 3 hits
    const { resolver } = makeResolver([[6, 5, 3, 1, 5]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '5' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(3);
  });

  it('net hits computed correctly for opposed roll', () => {
    // initiator: 4 hits, opposition: 2 hits → net = 2
    const { resolver, roller } = makeResolver();
    roller.enqueue([5, 5, 5, 5]); // initiator roll: 4 hits
    roller.enqueue([5, 5, 1, 1]); // opposition roll: 2 hits
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4', opposed: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(4);
    expect(result.opposedHits).toBe(2);
    expect(result.netHits).toBe(2);
  });

  it('net hits floored at zero when opposition exceeds initiator', () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([5, 1, 1, 1]); // initiator: 1 hit
    roller.enqueue([5, 5, 5, 1]); // opposition: 3 hits
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4', opposed: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.netHits).toBe(0);
  });

  it('unopposed roll: net hits equal initiator hits', () => {
    const { resolver } = makeResolver([[5, 5, 5, 1]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(3);
    expect(result.netHits).toBe(3);
    expect(result.opposedHits).toBeNull();
  });

  it('classifies as "critical" when net hits >= critical threshold', () => {
    const { resolver } = makeResolver([[5, 6, 5, 6, 5, 5, 5, 6]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '8' },
      makeCtx(),
      SR5E_RITUS, // critical: 4
    );
    expect(result.netHits).toBeGreaterThanOrEqual(4);
    expect(result.tier).toBe('critical');
  });

  it('classifies as "hit" when net hits in hit band', () => {
    const { resolver } = makeResolver([[5, 5, 1, 1, 1, 1]]);
    // 2 hits, not opposed → classify(2, {critical:4, hit:1, glancing:0}) = 'hit'
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '6' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(2);
    expect(result.tier).toBe('hit');
  });

  it('classifies as "glancing" when net hits = 0 and glancing tier at 0', () => {
    const { resolver } = makeResolver([[1, 2, 3, 4]]);
    // 0 hits, pool > 0 → classify(0, {critical:4, hit:1, glancing:0}) = 'glancing'
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.tier).toBe('glancing');
  });

  it('tier "miss" when pool is zero', () => {
    const { resolver } = makeResolver();
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.tier).toBe('miss');
  });
});

// Failure

describe('RollResolver — Failure', () => {
  it('null pool (unresolvable expression) treated as zero dice and emits warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver();
    // Expression that can't be resolved (unknown scope)
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '@unknown.field' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(0);
    expect(result.tier).toBe('miss');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('negative pool expression evaluates to 0 dice', () => {
    const { resolver } = makeResolver();
    // @initiator.system.agility - 10 = 4 - 10 = -6 → clamped to 0
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '@initiator.system.agility - 10' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(0);
    expect(result.tier).toBe('miss');
  });
});

// Combinatorial

describe('RollResolver — Combinatorial', () => {
  it('RollResult shape for unopposed roll', () => {
    const { resolver } = makeResolver([[5, 6, 1, 5]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result).toMatchObject({
      hits: 3,
      opposedHits: null,
      netHits: 3,
      tier: 'hit',
      faces: [5, 6, 1, 5],
      pool: 4,
    });
  });

  it('RollResult shape for opposed roll where opposition wins', () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([5, 1, 1, 1]); // initiator: 1 hit
    roller.enqueue([5, 5, 5, 5]); // opposition: 4 hits
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4', opposed: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(1);
    expect(result.opposedHits).toBe(4);
    expect(result.netHits).toBe(0);
    expect(result.tier).toBe('glancing');
  });

  it('per-step tiers override from RitusConfig', () => {
    // Pass a merged config with only {hit: 1} tiers
    const { resolver } = makeResolver([[5, 5, 1, 1]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      { id: 'test', mechanic: 'pool', threshold: 5, tiers: { hit: 1 } },
    );
    expect(result.hits).toBe(2);
    expect(result.tier).toBe('hit'); // 2 >= 1
  });

  it('RollResult is frozen (immutable value object)', () => {
    const { resolver } = makeResolver([[5, 5]]);
    const result = resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(Object.isFrozen(result)).toBe(true);
  });
});
