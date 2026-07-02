import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RitusRegistry } from '../../../../src/domain/services/RitusRegistry.js';
import { makeSr5eRitus, makeSimpleRitus } from '../../../fixtures/ritus.js';

// ---------------------------------------------------------------------------
// Boundary
// ---------------------------------------------------------------------------

describe('RitusRegistry — Boundary', () => {
  it('get() on an empty registry returns null', () => {
    const registry = new RitusRegistry();
    expect(registry.get('anything')).toBeNull();
  });

  it('get() with an empty string id returns null without throwing', () => {
    const registry = new RitusRegistry();
    expect(registry.get('')).toBeNull();
  });

  it('register() then get() returns the stored config immediately', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus());
    expect(registry.get('sr5e')).not.toBeNull();
  });

  it('resolve() with no overrides returns the base config unchanged', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus({ threshold: 5 }));
    const config = registry.resolve('sr5e', {});
    expect(config.threshold).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

describe('RitusRegistry — Scenario', () => {
  it('valid Ritus is stored and retrievable by id', () => {
    const registry = new RitusRegistry();
    const ritus = makeSr5eRitus();
    registry.register(ritus);

    const config = registry.get('sr5e');
    expect(config).not.toBeNull();
    expect(config!.id).toBe('sr5e');
    expect(config!.threshold).toBe(5);
    expect(config!.tiers).toEqual({ critical: 4, hit: 1, glancing: 0 });
  });

  it('duplicate registration warns and overwrites the previous entry', () => {
    const registry = new RitusRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    registry.register(makeSr5eRitus({ threshold: 5 }));
    registry.register(makeSr5eRitus({ threshold: 4 }));

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(registry.get('sr5e')!.threshold).toBe(4);

    warnSpy.mockRestore();
  });

  it('unregistered id returns null without throwing', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus());
    expect(registry.get('unknown-system')).toBeNull();
  });

  it('resolve() applies per-rule threshold override on top of base', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus({ threshold: 5 }));

    const config = registry.resolve('sr5e', { threshold: 4 });
    expect(config.threshold).toBe(4);
  });

  it('resolve() applies per-rule tiers override on top of base', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus());

    const config = registry.resolve('sr5e', { tiers: { hit: 2 } });
    expect(config.tiers).toEqual({ hit: 2 });
  });

  it('resolve() does not mutate the stored base config', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus({ threshold: 5 }));

    registry.resolve('sr5e', { threshold: 3 });

    expect(registry.get('sr5e')!.threshold).toBe(5);
  });

  it('absent override preserves the base threshold value', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus({ threshold: 5 }));

    const config = registry.resolve('sr5e', {});
    expect(config.threshold).toBe(5);
  });

  it('multiple different Ritus configs coexist in registry', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus());
    registry.register(makeSimpleRitus());

    expect(registry.get('sr5e')).not.toBeNull();
    expect(registry.get('simple')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Failure
// ---------------------------------------------------------------------------

describe('RitusRegistry — Failure', () => {
  it('invalid Ritus (missing mechanic) throws a descriptive error', () => {
    const registry = new RitusRegistry();
    const invalid = { id: 'bad', threshold: 5, tiers: {} };

    // @ts-expect-error intentional invalid input
    expect(() => registry.register(invalid)).toThrow();
  });

  it('invalid Ritus (missing threshold) throws', () => {
    const registry = new RitusRegistry();
    const invalid = { id: 'bad', mechanic: 'pool', tiers: {} };

    // @ts-expect-error intentional invalid input
    expect(() => registry.register(invalid)).toThrow();
  });

  it('invalid Ritus (missing id) throws', () => {
    const registry = new RitusRegistry();
    const invalid = { mechanic: 'pool', threshold: 5, tiers: {} };

    // @ts-expect-error intentional invalid input
    expect(() => registry.register(invalid)).toThrow();
  });

  it('resolve() throws when systemId is not registered', () => {
    const registry = new RitusRegistry();
    expect(() => registry.resolve('not-registered', {})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// UUID Methods
// ---------------------------------------------------------------------------

describe('RitusRegistry — UUID Methods', () => {
  it('registerByUUID then getByUUID returns the stored config', () => {
    const registry = new RitusRegistry();
    registry.registerByUUID('Compendium.my-system.ritus.abc', makeSr5eRitus());
    const config = registry.getByUUID('Compendium.my-system.ritus.abc');
    expect(config).not.toBeNull();
    expect(config!.id).toBe('sr5e');
    expect(config!.threshold).toBe(5);
  });

  it('duplicate UUID warns and overwrites', () => {
    const registry = new RitusRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registry.registerByUUID('uuid-1', makeSr5eRitus({ threshold: 5 }));
    registry.registerByUUID('uuid-1', makeSr5eRitus({ threshold: 4 }));
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(registry.getByUUID('uuid-1')!.threshold).toBe(4);
    warnSpy.mockRestore();
  });

  it('getByUUID returns null for unknown UUID', () => {
    const registry = new RitusRegistry();
    expect(registry.getByUUID('not-registered')).toBeNull();
  });

  it('registerByUUID does not affect the systemId store', () => {
    const registry = new RitusRegistry();
    registry.registerByUUID('uuid-1', makeSr5eRitus());
    // systemId 'sr5e' was NOT registered via register()
    expect(registry.get('sr5e')).toBeNull();
  });

  it('getByUUID and get() are independent stores', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus({ threshold: 5 }));
    registry.registerByUUID('uuid-1', makeSr5eRitus({ threshold: 3 }));
    expect(registry.get('sr5e')!.threshold).toBe(5);
    expect(registry.getByUUID('uuid-1')!.threshold).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Combinatorial
// ---------------------------------------------------------------------------

describe('RitusRegistry — Combinatorial', () => {
  it('register ×2 same id + resolve returns merged with second registration values', () => {
    const registry = new RitusRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    registry.register(makeSr5eRitus({ threshold: 5, tiers: { critical: 4, hit: 1, glancing: 0 } }));
    registry.register(makeSr5eRitus({ threshold: 3, tiers: { hit: 1 } }));

    const config = registry.resolve('sr5e', { threshold: 2 });

    // Base is now the second registration (threshold: 3); override wins: threshold=2
    expect(config.threshold).toBe(2);
    // Tiers from second registration, no override
    expect(config.tiers).toEqual({ hit: 1 });

    warnSpy.mockRestore();
  });

  it('register sr5e and simple, resolve each independently without cross-contamination', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus({ threshold: 5 }));
    registry.register(makeSimpleRitus({ threshold: 7 }));

    const sr5eConfig = registry.resolve('sr5e', {});
    const simpleConfig = registry.resolve('simple', {});

    expect(sr5eConfig.threshold).toBe(5);
    expect(simpleConfig.threshold).toBe(7);
  });

  it('register, resolve with tiers override, then get() still returns original tiers', () => {
    const registry = new RitusRegistry();
    registry.register(makeSr5eRitus());

    registry.resolve('sr5e', { tiers: { critical: 99 } });
    const stored = registry.get('sr5e')!;

    expect(stored.tiers).toEqual({ critical: 4, hit: 1, glancing: 0 });
  });
});
