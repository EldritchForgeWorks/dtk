import type { RitusConfig } from '../value-objects/RitusConfig.js';

export interface Ritus {
  id: string;
  mechanic: string;
  threshold: number;
  tiers: Record<string, number>;
}

function validate(ritus: unknown): asserts ritus is Ritus {
  if (!ritus || typeof ritus !== 'object') {
    throw new Error('Invalid Ritus: must be an object');
  }
  const r = ritus as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof r['id'] !== 'string' || !r['id']) errors.push('missing or empty "id"');
  if (typeof r['mechanic'] !== 'string' || !r['mechanic']) errors.push('missing or empty "mechanic"');
  if (typeof r['threshold'] !== 'number') errors.push('missing or non-number "threshold"');
  if (typeof r['tiers'] !== 'object' || r['tiers'] === null || Array.isArray(r['tiers'])) {
    errors.push('missing or invalid "tiers"');
  }
  if (errors.length > 0) throw new Error(`Invalid Ritus: ${errors.join('; ')}`);
}

export class RitusRegistry {
  private readonly store = new Map<string, RitusConfig>();

  register(ritus: Ritus): void {
    validate(ritus);

    if (this.store.has(ritus.id)) {
      console.warn(
        `RitusRegistry: duplicate registration for id "${ritus.id}" — overwriting.`,
      );
    }

    this.store.set(ritus.id, {
      id: ritus.id,
      mechanic: ritus.mechanic,
      threshold: ritus.threshold,
      tiers: { ...ritus.tiers },
    });
  }

  get(systemId: string): RitusConfig | null {
    return this.store.get(systemId) ?? null;
  }

  resolve(
    systemId: string,
    overrides: Partial<Pick<RitusConfig, 'threshold' | 'tiers'>>,
  ): RitusConfig {
    const base = this.store.get(systemId);
    if (!base) {
      throw new Error(
        `RitusRegistry: no config registered for systemId "${systemId}"`,
      );
    }

    return {
      ...base,
      ...(overrides.threshold !== undefined ? { threshold: overrides.threshold } : {}),
      ...(overrides.tiers !== undefined ? { tiers: overrides.tiers } : {}),
    };
  }
}
