// Local Ritus type definition matching the @eldritchforgeworks/dtk-types Ritus contract.
// This avoids a hard dep on @eldritchforgeworks/dtk-types in fixtures.
export interface Ritus {
  id: string;
  mechanic: string;
  threshold: number;
  tiers: Record<string, number>;
}

export function makeSr5eRitus(overrides?: Partial<Ritus>): Ritus {
  return {
    id: 'sr5e',
    mechanic: 'pool',
    threshold: 5,
    tiers: { critical: 4, hit: 1, glancing: 0 },
    ...overrides,
  };
}

export function makeSimpleRitus(overrides?: Partial<Ritus>): Ritus {
  return {
    id: 'simple',
    mechanic: 'pool',
    threshold: 5,
    tiers: { hit: 1 },
    ...overrides,
  };
}
