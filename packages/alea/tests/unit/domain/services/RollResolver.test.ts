import { describe, it, expect, vi } from 'vitest';
import { RollResolver } from '../../../../src/domain/services/RollResolver.js';
import { RitusRegistry } from '../../../../src/domain/services/RitusRegistry.js';
import { ExpressionParser } from '../../../../src/domain/services/ExpressionParser.js';
import { classify } from '../../../../src/domain/services/TierResolver.js';
import { DeterministicDiceRoller } from '../../../../src/adapters/in-memory/DeterministicDiceRoller.js';
import type { EvaluationContext } from '../../../../src/ports/IExpressionDelegate.js';
import { buildBareEvalContext } from '../../../helpers/buildContext.js';

const SR5E_TIERS = { critical: 4, hit: 1, glancing: 0 };
const SR5E_RITUS = {
  id: 'sr5e',
  mechanic: 'pool',
  sides: 6,
  explodes: false,
  threshold: 5,
  tiers: SR5E_TIERS,
};

function makeCtx(overrides?: Partial<EvaluationContext>): EvaluationContext {
  return buildBareEvalContext(overrides);
}

function makeResolver(sequences?: number[][]): { resolver: RollResolver; roller: DeterministicDiceRoller } {
  const roller = new DeterministicDiceRoller(sequences);
  const parser = new ExpressionParser();
  const resolver = new RollResolver(roller, parser);
  return { resolver, roller };
}

function makeResolverWithRegistry(
  registry: RitusRegistry,
  sequences?: number[][],
): { resolver: RollResolver; roller: DeterministicDiceRoller } {
  const roller = new DeterministicDiceRoller(sequences);
  const parser = new ExpressionParser();
  const resolver = new RollResolver(roller, parser, registry);
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
  it('pool = 0 produces zero faces, zero hits, and tier "miss"', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(0);
    expect(result.faces).toEqual([]);
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });

  it('pool = 1 rolls exactly one die', async () => {
    const { resolver } = makeResolver([[5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(1);
    expect(result.faces).toHaveLength(1);
  });

  it('all faces below threshold produces zero hits', async () => {
    const { resolver } = makeResolver([[1, 2, 3, 4]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      { ...SR5E_RITUS, tiers: { hit: 1 } },
    );
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });

  it('all faces at or above threshold count as hits', async () => {
    const { resolver } = makeResolver([[5, 6, 5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(4);
  });
});

// Scenario

describe('RollResolver — Scenario', () => {
  it('pool expression resolves via ExpressionParser (literal)', async () => {
    const { resolver } = makeResolver([[5, 5, 5, 5, 5, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '6' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(6);
    expect(result.faces).toHaveLength(6);
  });

  it('pool expression resolves via ExpressionParser (@initiator reference)', async () => {
    const { resolver } = makeResolver([[5, 5, 5, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '@initiator.system.agility' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(4);
    expect(result.faces).toHaveLength(4);
  });

  it('hits counted correctly (faces >= threshold)', async () => {
    const { resolver } = makeResolver([[6, 5, 3, 1, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '5' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(3);
  });

  it('net hits computed correctly for opposed roll', async () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([5, 5, 5, 5]);
    roller.enqueue([5, 5, 1, 1]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4', opposed: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(4);
    expect(result.opposedHits).toBe(2);
    expect(result.netHits).toBe(2);
  });

  it('net hits floored at zero when opposition exceeds initiator', async () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([5, 1, 1, 1]);
    roller.enqueue([5, 5, 5, 1]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4', opposed: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.netHits).toBe(0);
  });

  it('unopposed roll: net hits equal initiator hits', async () => {
    const { resolver } = makeResolver([[5, 5, 5, 1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(3);
    expect(result.netHits).toBe(3);
    expect(result.opposedHits).toBeNull();
  });

  it('classifies as "critical" when net hits >= critical threshold', async () => {
    const { resolver } = makeResolver([[5, 6, 5, 6, 5, 5, 5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '8' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.netHits).toBeGreaterThanOrEqual(4);
    expect(result.tier).toBe('critical');
  });

  it('classifies as "hit" when net hits in hit band', async () => {
    const { resolver } = makeResolver([[5, 5, 1, 1, 1, 1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '6' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(2);
    expect(result.tier).toBe('hit');
  });

  it('classifies as "glancing" when net hits = 0 and glancing tier at 0', async () => {
    const { resolver } = makeResolver([[1, 2, 3, 4]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.tier).toBe('glancing');
  });

  it('tier "miss" when pool is zero', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.tier).toBe('miss');
  });
});

// Failure

describe('RollResolver — Failure', () => {
  it('null pool (unresolvable expression) treated as zero dice and emits warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '@unknown.field' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.pool).toBe(0);
    expect(result.tier).toBe('miss');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('negative pool expression evaluates to 0 dice', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
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
  it('RollResult shape for unopposed roll', async () => {
    const { resolver } = makeResolver([[5, 6, 1, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result).toMatchObject({
      hits: 3,
      opposedHits: null,
      netHits: 3,
      tier: 'hit',
      mechanic: 'pool',
      faces: [5, 6, 1, 5],
      pool: 4,
    });
  });

  it('RollResult shape for opposed roll where opposition wins', async () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([5, 1, 1, 1]);
    roller.enqueue([5, 5, 5, 5]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4', opposed: '4' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(1);
    expect(result.opposedHits).toBe(4);
    expect(result.netHits).toBe(0);
    expect(result.tier).toBe('glancing');
  });

  it('per-step tiers override from RitusConfig', async () => {
    const { resolver } = makeResolver([[5, 5, 1, 1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      { id: 'test', mechanic: 'pool', sides: 6, explodes: false, threshold: 5, tiers: { hit: 1 } },
    );
    expect(result.hits).toBe(2);
    expect(result.tier).toBe('hit');
  });

  it('RollResult is frozen (immutable value object)', async () => {
    const { resolver } = makeResolver([[5, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// UUID Path

describe('RollResolver — UUID Path', () => {
  it('uses registered RitusConfig when step has ritus UUID', async () => {
    const registry = new RitusRegistry();
    registry.registerByUUID('Compendium.my-system.ritus.abc', {
      id: 'uuid-ritus',
      mechanic: 'pool',
      sides: 6,
      explodes: false,
      threshold: 5,
      tiers: { critical: 4, hit: 1, glancing: 0 },
    });
    const { resolver } = makeResolverWithRegistry(registry, [[5, 5, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3', ritus: 'Compendium.my-system.ritus.abc' },
      makeCtx(),
      null,
    );
    expect(result.hits).toBe(3);
    expect(result.tier).toBe('hit');
    expect(result.pool).toBe(3);
  });

  it('falls back to passed ritusConfig when step has no ritus field', async () => {
    const registry = new RitusRegistry();
    const { resolver } = makeResolverWithRegistry(registry, [[5, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.hits).toBe(2);
    expect(result.tier).toBe('hit');
  });

  it('throws descriptive error when UUID not registered and no fallback config', async () => {
    const registry = new RitusRegistry();
    const { resolver } = makeResolverWithRegistry(registry);
    await expect(
      resolver.resolve(
        { type: 'rule', id: 's', pool: '2', ritus: 'Compendium.my-system.ritus.missing' },
        makeCtx(),
        null,
      ),
    ).rejects.toThrow('Compendium.my-system.ritus.missing');
  });
});

// ── 3.1+3.2  pool-sum ──────────────────────────────────────────────────────

const POOL_SUM_RITUS = {
  id: 'pool-sum-test',
  mechanic: 'pool-sum',
  sides: 6,
  explodes: false,
  threshold: 0, // unused for pool-sum
  tiers: { great: 10, hit: 1 },
};

describe('RollResolver — pool-sum — Boundary', () => {
  it('pool = 0 produces zero sum, zero hits, and tier "miss"', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.pool).toBe(0);
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
    expect(result.faces).toEqual([]);
  });

  it('pool = 1 sums to single face value', async () => {
    const { resolver } = makeResolver([[6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.hits).toBe(6);
    expect(result.faces).toEqual([6]);
  });

  it('minimum possible sum classifies to lowest tier', async () => {
    const { resolver } = makeResolver([[1, 1, 1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.hits).toBe(3);
    expect(result.tier).toBe('hit'); // 3 >= 1
  });

  it('sum at great threshold exactly classifies as great', async () => {
    const { resolver } = makeResolver([[5, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.hits).toBe(10);
    expect(result.tier).toBe('great');
  });
});

describe('RollResolver — pool-sum — Scenario', () => {
  it('sums all face values correctly', async () => {
    const { resolver } = makeResolver([[3, 4, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.hits).toBe(12);
    expect(result.netHits).toBe(12);
    expect(result.tier).toBe('great');
  });

  it('classifies correctly when sum is below great but above hit threshold', async () => {
    const { resolver } = makeResolver([[2, 3, 4]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.hits).toBe(9);
    expect(result.tier).toBe('hit');
  });

  it('opposed roll subtracts sums — initiator wins', async () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([5, 5, 5]); // sum 15
    roller.enqueue([4, 4, 4]); // sum 12
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3', opposed: '3' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.hits).toBe(15);
    expect(result.opposedHits).toBe(12);
    expect(result.netHits).toBe(3);
    expect(result.tier).toBe('hit');
  });

  it('opposed roll: net sum floored at zero when opposition wins', async () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([2, 2, 2]); // sum 6
    roller.enqueue([4, 4, 4]); // sum 12
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3', opposed: '3' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.netHits).toBe(0);
    expect(result.tier).toBe('miss');
  });
});

describe('RollResolver — pool-sum — Failure', () => {
  it('null pool emits warning and produces miss', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '@unknown.field' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('RollResolver — pool-sum — Combinatorial', () => {
  it('result shape includes mechanic = "pool-sum"', async () => {
    const { resolver } = makeResolver([[4, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result).toMatchObject({
      hits: 10,
      opposedHits: null,
      netHits: 10,
      mechanic: 'pool-sum',
      tier: 'great',
      pool: 2,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── 3.3+3.4  roll-under ───────────────────────────────────────────────────

const ROLL_UNDER_RITUS = {
  id: 'roll-under-test',
  mechanic: 'roll-under',
  sides: 6,
  explodes: false,
  threshold: 4, // strictly < 4 counts as hit
  tiers: { hit: 1, great: 3 },
};

describe('RollResolver — roll-under — Boundary', () => {
  it('face exactly at threshold does NOT count as hit', async () => {
    const { resolver } = makeResolver([[4]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.hits).toBe(0);
  });

  it('face strictly below threshold counts as hit', async () => {
    const { resolver } = makeResolver([[3]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.hits).toBe(1);
  });

  it('pool = 0 produces zero hits and tier "miss"', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });

  it('all faces at or above threshold = zero hits', async () => {
    const { resolver } = makeResolver([[4, 5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.hits).toBe(0);
  });
});

describe('RollResolver — roll-under — Scenario', () => {
  it('counts only sub-threshold faces', async () => {
    const { resolver } = makeResolver([[1, 3, 4, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.hits).toBe(2); // 1 and 3 are < 4
    expect(result.faces).toEqual([1, 3, 4, 6]);
  });

  it('classifies netHits correctly against tiers', async () => {
    const { resolver } = makeResolver([[1, 2, 3, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.hits).toBe(3);
    expect(result.tier).toBe('great');
  });

  it('opposed roll uses sub-threshold count for both sides', async () => {
    const { resolver, roller } = makeResolver();
    roller.enqueue([1, 2, 5, 6]); // 2 sub-threshold hits
    roller.enqueue([3, 4, 5, 6]); // 1 sub-threshold hit
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4', opposed: '4' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.hits).toBe(2);
    expect(result.opposedHits).toBe(1);
    expect(result.netHits).toBe(1);
  });
});

describe('RollResolver — roll-under — Failure', () => {
  it('null pool emits warning and tier is "miss"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '@unknown.field' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.tier).toBe('miss');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('RollResolver — roll-under — Combinatorial', () => {
  it('result shape includes mechanic = "roll-under"', async () => {
    const { resolver } = makeResolver([[1, 2, 5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result).toMatchObject({
      hits: 2,
      mechanic: 'roll-under',
      pool: 4,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── 3.5+3.6  step-die ─────────────────────────────────────────────────────

const STEP_DIE_RITUS = {
  id: 'step-die-test',
  mechanic: 'step-die',
  sides: 8,
  explodes: false,
  threshold: 5,
  tiers: { hit: 1 },
};

describe('RollResolver — step-die — Boundary', () => {
  it('always rolls exactly 1 die regardless of pool expression', async () => {
    const { resolver, roller } = makeResolver();
    const rollSpy = vi.spyOn(roller, 'roll');
    roller.enqueue([7]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '10' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(rollSpy).toHaveBeenCalledWith(1, 8, {});
  });

  it('pool field in result is always 1', async () => {
    const { resolver } = makeResolver([[7]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '10' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(result.pool).toBe(1);
  });

  it('face at or above threshold = 1 hit', async () => {
    const { resolver } = makeResolver([[5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(result.hits).toBe(1);
  });

  it('face below threshold = 0 hits', async () => {
    const { resolver } = makeResolver([[4]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(result.hits).toBe(0);
  });
});

describe('RollResolver — step-die — Scenario', () => {
  it('pool expression value is ignored — still rolls 1 die', async () => {
    const { resolver } = makeResolver([[6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '5' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(result.pool).toBe(1);
    expect(result.faces).toHaveLength(1);
    expect(result.hits).toBe(1);
  });

  it('null pool expression does not cause warning (pool ignored for step-die)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[6]]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '@unknown.field' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('tier classified from single die face via netHits', async () => {
    const { resolver } = makeResolver([[7]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(result.tier).toBe('hit');
  });
});

describe('RollResolver — step-die — Failure', () => {
  it('face below threshold results in zero hits and miss tier (no hit tier at 0)', async () => {
    const { resolver } = makeResolver([[2]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      { ...STEP_DIE_RITUS, tiers: { hit: 1 } },
    );
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });
});

describe('RollResolver — step-die — Combinatorial', () => {
  it('result shape includes mechanic = "step-die" and pool = 1', async () => {
    const { resolver } = makeResolver([[6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(result).toMatchObject({
      hits: 1,
      mechanic: 'step-die',
      pool: 1,
      faces: [6],
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── 3.7+3.8  advantage-disadvantage ──────────────────────────────────────

const ADV_RITUS = {
  id: 'adv-test',
  mechanic: 'advantage-disadvantage',
  sides: 20,
  explodes: false,
  keepMode: 'highest' as const,
  threshold: 10,
  tiers: { hit: 1 },
};

const DIS_RITUS = {
  ...ADV_RITUS,
  keepMode: 'lowest' as const,
};

describe('RollResolver — advantage-disadvantage — Boundary', () => {
  it('keeps highest face when keepMode = highest', async () => {
    const { resolver } = makeResolver([[4, 15]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result.hits).toBe(1); // 15 >= 10
    expect(result.faces).toEqual([4, 15]);
  });

  it('keeps lowest face when keepMode = lowest', async () => {
    const { resolver } = makeResolver([[4, 15]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      DIS_RITUS,
    );
    expect(result.hits).toBe(0); // 4 < 10
    expect(result.faces).toEqual([4, 15]);
  });

  it('pool = 0 produces zero hits and tier "miss"', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });

  it('all original faces stored in result.faces', async () => {
    const { resolver } = makeResolver([[3, 7, 18]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result.faces).toEqual([3, 7, 18]);
  });
});

describe('RollResolver — advantage-disadvantage — Scenario', () => {
  it('passes keepMode to roller in opts', async () => {
    const { resolver, roller } = makeResolver();
    const rollSpy = vi.spyOn(roller, 'roll');
    roller.enqueue([5, 15]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(rollSpy).toHaveBeenCalledWith(2, 20, { keepMode: 'highest' });
  });

  it('pool field in result = original pool count', async () => {
    const { resolver } = makeResolver([[5, 15]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result.pool).toBe(2);
  });

  it('highest of three dice determines hit', async () => {
    const { resolver } = makeResolver([[3, 12, 7]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result.hits).toBe(1); // 12 >= 10
  });

  it('lowest of three dice determines hit for disadvantage', async () => {
    const { resolver } = makeResolver([[3, 12, 7]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      DIS_RITUS,
    );
    expect(result.hits).toBe(0); // 3 < 10
  });
});

describe('RollResolver — advantage-disadvantage — Failure', () => {
  it('pool = 0 with no dice rolled returns miss regardless of keepMode', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result.tier).toBe('miss');
    expect(result.faces).toEqual([]);
  });
});

describe('RollResolver — advantage-disadvantage — Combinatorial', () => {
  it('result shape includes mechanic = "advantage-disadvantage"', async () => {
    const { resolver } = makeResolver([[5, 18]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result).toMatchObject({
      hits: 1,
      mechanic: 'advantage-disadvantage',
      pool: 2,
      faces: [5, 18],
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── 3.9+3.10  target-number ───────────────────────────────────────────────

const TN_RITUS = {
  id: 'tn-test',
  mechanic: 'target-number',
  sides: 12,
  explodes: false,
  threshold: 15, // die + modifier must reach 15
  tiers: { hit: 1 },
};

describe('RollResolver — target-number — Boundary', () => {
  it('always rolls exactly 1 die', async () => {
    const { resolver, roller } = makeResolver();
    const rollSpy = vi.spyOn(roller, 'roll');
    roller.enqueue([10]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      TN_RITUS,
    );
    expect(rollSpy).toHaveBeenCalledWith(1, 12, {});
  });

  it('pool field in result = modifier value (not dice count)', async () => {
    const { resolver } = makeResolver([[10]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result.pool).toBe(3);
  });

  it('face + modifier >= threshold → 1 hit', async () => {
    const { resolver } = makeResolver([[10]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '5' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result.hits).toBe(1); // 10 + 5 = 15 >= 15
  });

  it('face + modifier < threshold → 0 hits', async () => {
    const { resolver } = makeResolver([[10]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result.hits).toBe(0); // 10 + 4 = 14 < 15
  });
});

describe('RollResolver — target-number — Scenario', () => {
  it('null pool expression uses modifier = 0', async () => {
    const { resolver } = makeResolver([[15]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '@unknown.field' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result.pool).toBe(0);
    expect(result.hits).toBe(1); // 15 + 0 = 15 >= 15
  });

  it('null pool does not emit warning for target-number', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[15]]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '@unknown.field' },
      makeCtx(),
      TN_RITUS,
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('negative modifier reduces total below threshold', async () => {
    // @initiator.system.agility = 4, pool = "4 - 6" = -2
    const { resolver } = makeResolver([[10]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '@initiator.system.agility - 6' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result.pool).toBe(-2);
    expect(result.hits).toBe(0); // 10 + (-2) = 8 < 15
  });

  it('face stored in result.faces', async () => {
    const { resolver } = makeResolver([[9]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '5' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result.faces).toEqual([9]);
  });
});

describe('RollResolver — target-number — Failure', () => {
  it('very high threshold unreachable = 0 hits', async () => {
    const { resolver } = makeResolver([[1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      { ...TN_RITUS, threshold: 100 },
    );
    expect(result.hits).toBe(0);
  });
});

describe('RollResolver — target-number — Combinatorial', () => {
  it('result shape includes mechanic = "target-number" and pool = modifier', async () => {
    const { resolver } = makeResolver([[8]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '7' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result).toMatchObject({
      hits: 1, // 8 + 7 = 15 >= 15
      mechanic: 'target-number',
      pool: 7,
      faces: [8],
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── 3.11+3.12  exploding ──────────────────────────────────────────────────

const EXPLODING_RITUS = {
  id: 'exploding-test',
  mechanic: 'exploding',
  sides: 6,
  explodes: true,
  threshold: 5,
  tiers: { hit: 1, great: 3 },
};

describe('RollResolver — exploding — Boundary', () => {
  it('pool = 0 produces miss', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(result.hits).toBe(0);
    expect(result.tier).toBe('miss');
  });

  it('roller is called with { explodes: true }', async () => {
    const { resolver, roller } = makeResolver();
    const rollSpy = vi.spyOn(roller, 'roll');
    roller.enqueue([5, 6]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(rollSpy).toHaveBeenCalledWith(2, 6, { explodes: true });
  });

  it('all faces >= threshold counted as hits', async () => {
    const { resolver } = makeResolver([[5, 6, 1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(result.hits).toBe(2); // 5 and 6 qualify
  });
});

describe('RollResolver — exploding — Scenario', () => {
  it('all returned faces (including any exploded extras) counted toward hits', async () => {
    // Simulate a roller returning 5 faces for a pool-5 roll — all qualifying faces counted
    const { resolver } = makeResolver([[5, 6, 5, 6, 5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '5' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(result.faces).toEqual([5, 6, 5, 6, 5]);
    expect(result.hits).toBe(5);
  });

  it('classifies based on net hits', async () => {
    const { resolver } = makeResolver([[5, 5, 5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(result.tier).toBe('great');
  });
});

describe('RollResolver — exploding — Failure', () => {
  it('no hits when all faces below threshold', async () => {
    const { resolver } = makeResolver([[1, 2, 3, 4]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(result.hits).toBe(0);
  });
});

describe('RollResolver — exploding — Combinatorial', () => {
  it('result shape includes mechanic = "exploding"', async () => {
    const { resolver } = makeResolver([[5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(result).toMatchObject({
      hits: 2,
      mechanic: 'exploding',
      pool: 2,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── 3.13+3.14  fallback (drama-die, custom) ───────────────────────────────

const DRAMA_RITUS = {
  id: 'drama-test',
  mechanic: 'drama-die',
  sides: 6,
  explodes: false,
  threshold: 5,
  tiers: { hit: 1 },
};

const CUSTOM_RITUS = {
  id: 'custom-test',
  mechanic: 'custom',
  sides: 6,
  explodes: false,
  threshold: 5,
  tiers: { hit: 1 },
};

describe('RollResolver — fallback (drama-die, custom) — Boundary', () => {
  it('drama-die emits console.warn containing mechanic name', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[5]]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      DRAMA_RITUS,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('drama-die'));
    warnSpy.mockRestore();
  });

  it('custom emits console.warn containing mechanic name', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[5]]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      CUSTOM_RITUS,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('custom'));
    warnSpy.mockRestore();
  });

  it('warning message contains "[dtk-alea]" prefix', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[5]]);
    await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      DRAMA_RITUS,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[dtk-alea]'));
    warnSpy.mockRestore();
  });
});

describe('RollResolver — fallback (drama-die, custom) — Scenario', () => {
  it('drama-die falls back to pool-count logic (faces >= threshold = hits)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[5, 1, 6, 3]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '4' },
      makeCtx(),
      DRAMA_RITUS,
    );
    expect(result.hits).toBe(2); // 5 and 6 qualify
    warnSpy.mockRestore();
  });

  it('custom falls back to pool-count logic', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[5, 5, 1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '3' },
      makeCtx(),
      CUSTOM_RITUS,
    );
    expect(result.hits).toBe(2);
    warnSpy.mockRestore();
  });
});

describe('RollResolver — fallback (drama-die, custom) — Failure', () => {
  it('pool = 0 produces miss (same as pool-count)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      DRAMA_RITUS,
    );
    expect(result.tier).toBe('miss');
    warnSpy.mockRestore();
  });
});

describe('RollResolver — fallback (drama-die, custom) — Combinatorial', () => {
  it('drama-die result shape includes mechanic = "drama-die"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      DRAMA_RITUS,
    );
    expect(result.mechanic).toBe('drama-die');
    expect(Object.isFrozen(result)).toBe(true);
    warnSpy.mockRestore();
  });

  it('custom result shape includes mechanic = "custom"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { resolver } = makeResolver([[5, 6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '2' },
      makeCtx(),
      CUSTOM_RITUS,
    );
    expect(result.mechanic).toBe('custom');
    expect(Object.isFrozen(result)).toBe(true);
    warnSpy.mockRestore();
  });
});

// ── 3.15  mechanic field in ALL results ───────────────────────────────────

describe('RollResolver — mechanic field present in all results (3.15)', () => {
  it('pool-count (default) result has mechanic field', async () => {
    const { resolver } = makeResolver([[5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.mechanic).toBe('pool');
  });

  it('pool-sum result has mechanic field', async () => {
    const { resolver } = makeResolver([[5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      POOL_SUM_RITUS,
    );
    expect(result.mechanic).toBe('pool-sum');
  });

  it('roll-under result has mechanic field', async () => {
    const { resolver } = makeResolver([[1]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      ROLL_UNDER_RITUS,
    );
    expect(result.mechanic).toBe('roll-under');
  });

  it('step-die result has mechanic field', async () => {
    const { resolver } = makeResolver([[6]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      STEP_DIE_RITUS,
    );
    expect(result.mechanic).toBe('step-die');
  });

  it('advantage-disadvantage result has mechanic field', async () => {
    const { resolver } = makeResolver([[15]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      ADV_RITUS,
    );
    expect(result.mechanic).toBe('advantage-disadvantage');
  });

  it('target-number result has mechanic field', async () => {
    const { resolver } = makeResolver([[10]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '5' },
      makeCtx(),
      TN_RITUS,
    );
    expect(result.mechanic).toBe('target-number');
  });

  it('exploding result has mechanic field', async () => {
    const { resolver } = makeResolver([[5]]);
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '1' },
      makeCtx(),
      EXPLODING_RITUS,
    );
    expect(result.mechanic).toBe('exploding');
  });

  it('pool = 0 (miss) result still has mechanic field', async () => {
    const { resolver } = makeResolver();
    const result = await resolver.resolve(
      { type: 'rule', id: 's', pool: '0' },
      makeCtx(),
      SR5E_RITUS,
    );
    expect(result.mechanic).toBe('pool');
    expect(result.tier).toBe('miss');
  });
});
