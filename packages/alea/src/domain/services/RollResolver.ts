import type { IDiceRoller, DiceResult } from '../../ports/IDiceRoller.js';
import type { EvaluationContext } from '../../ports/IExpressionDelegate.js';
import type { RollResult } from '../value-objects/RollResult.js';
import type { RitusConfig } from '../value-objects/RitusConfig.js';
import { ExpressionParser } from './ExpressionParser.js';
import { classify } from './TierResolver.js';
import type { RitusRegistry } from './RitusRegistry.js';

export interface RuleStep {
  type: 'rule';
  id: string;
  pool: string;
  opposed?: string;
  threshold?: number;
  tiers?: Record<string, number>;
  ritus?: string;
  [key: string]: unknown;
}

export class RollResolver {
  private readonly roller: IDiceRoller;
  private readonly parser: ExpressionParser;
  private readonly registry?: RitusRegistry;

  constructor(roller: IDiceRoller, parser: ExpressionParser, registry?: RitusRegistry) {
    this.roller = roller;
    this.parser = parser;
    this.registry = registry;
  }

  async resolve(
    step: RuleStep,
    context: EvaluationContext,
    ritusConfig: RitusConfig | null = null,
  ): Promise<RollResult> {
    // Resolve effective ritus config: UUID lookup takes priority over passed-in config
    let effectiveConfig: RitusConfig;
    if (step.ritus && this.registry) {
      const found = this.registry.getByUUID(step.ritus);
      if (found) {
        effectiveConfig = found;
      } else if (ritusConfig) {
        effectiveConfig = ritusConfig;
      } else {
        throw new Error(
          `RollResolver: UUID "${step.ritus}" not found in registry and no fallback ritusConfig provided`,
        );
      }
    } else if (ritusConfig) {
      effectiveConfig = ritusConfig;
    } else {
      throw new Error('RollResolver: no ritusConfig provided');
    }

    const mechanic = effectiveConfig.mechanic;
    const threshold = effectiveConfig.threshold;
    const sides = effectiveConfig.sides ?? 6;

    // Stage 1: Evaluate pool expression
    const rawPool = this.parser.evaluate(step.pool, context);

    // Warn on null pool for dice-count mechanics only
    if (rawPool === null && mechanic !== 'step-die' && mechanic !== 'target-number') {
      console.warn(
        `RollResolver: pool expression "${step.pool}" evaluated to null — treating as zero dice.`,
      );
    }
    const pool = rawPool === null ? 0 : Math.max(0, Math.floor(rawPool));

    // Stage 2+3: Roll dice and count hits (mechanic dispatch)
    let faces: number[] = [];
    let hits = 0;
    let resultPool = pool;
    const rolls: unknown[] = [];

    if (mechanic === 'pool-sum') {
      // Sum all faces; classify sum against tier thresholds
      if (pool > 0) {
        const result: DiceResult = await this.roller.roll(pool, sides, { explodes: effectiveConfig.explodes });
        faces = result.faces;
        if (result.raw !== null) rolls.push(result.raw);
        hits = faces.reduce((sum, f) => sum + f, 0);
      }
    } else if (mechanic === 'roll-under') {
      // Count faces strictly below threshold as hits
      if (pool > 0) {
        const result: DiceResult = await this.roller.roll(pool, sides, { explodes: effectiveConfig.explodes });
        faces = result.faces;
        if (result.raw !== null) rolls.push(result.raw);
        hits = faces.filter((f) => f < threshold).length;
      }
    } else if (mechanic === 'step-die') {
      // Always roll exactly 1 die regardless of pool expression
      resultPool = 1;
      const result: DiceResult = await this.roller.roll(1, sides, {});
      faces = result.faces;
      if (result.raw !== null) rolls.push(result.raw);
      hits = faces[0] >= threshold ? 1 : 0;
    } else if (mechanic === 'advantage-disadvantage') {
      // Roll pool dice, keep highest or lowest based on keepMode
      if (pool > 0) {
        const result: DiceResult = await this.roller.roll(pool, sides, { keepMode: effectiveConfig.keepMode });
        faces = result.faces;
        if (result.raw !== null) rolls.push(result.raw);
        const keptFace =
          effectiveConfig.keepMode === 'lowest'
            ? Math.min(...faces)
            : Math.max(...faces);
        hits = keptFace >= threshold ? 1 : 0;
      }
    } else if (mechanic === 'target-number') {
      // Pool expression is a flat modifier; always roll exactly 1 die
      const modifier = rawPool === null ? 0 : Math.floor(rawPool);
      resultPool = modifier;
      const result: DiceResult = await this.roller.roll(1, sides, {});
      faces = result.faces;
      if (result.raw !== null) rolls.push(result.raw);
      hits = faces[0] + modifier >= threshold ? 1 : 0;
    } else if (mechanic === 'exploding') {
      // Pool-count with explodes always true for this mechanic
      if (pool > 0) {
        const result: DiceResult = await this.roller.roll(pool, sides, { explodes: true });
        faces = result.faces;
        if (result.raw !== null) rolls.push(result.raw);
        hits = faces.filter((f) => f >= threshold).length;
      }
    } else if (mechanic === 'drama-die' || mechanic === 'custom') {
      // Deferred mechanics — fall back to pool-count with warning
      console.warn(
        `[dtk-alea] RollResolver: mechanic "${mechanic}" not yet implemented, falling back to pool-count`,
      );
      if (pool > 0) {
        const result: DiceResult = await this.roller.roll(pool, sides, { explodes: effectiveConfig.explodes });
        faces = result.faces;
        if (result.raw !== null) rolls.push(result.raw);
        hits = faces.filter((f) => f >= threshold).length;
      }
    } else {
      // pool-count, pool, standard, or any unrecognised mechanic → default pool-count
      if (pool > 0) {
        const result: DiceResult = await this.roller.roll(pool, sides, { explodes: effectiveConfig.explodes });
        faces = result.faces;
        if (result.raw !== null) rolls.push(result.raw);
        hits = faces.filter((f) => f >= threshold).length;
      }
    }

    // Stage 4: Opposed roll (mechanic-aware)
    let opposedHits: number | null = null;
    if (step.opposed) {
      const rawOpposed = this.parser.evaluate(step.opposed, context);
      const opposedPool =
        rawOpposed === null ? 0 : Math.max(0, Math.floor(rawOpposed));
      if (opposedPool > 0) {
        const opposedResult: DiceResult = await this.roller.roll(opposedPool, sides, { explodes: effectiveConfig.explodes });
        if (opposedResult.raw !== null) rolls.push(opposedResult.raw);
        if (mechanic === 'pool-sum') {
          opposedHits = opposedResult.faces.reduce((sum, f) => sum + f, 0);
        } else if (mechanic === 'roll-under') {
          opposedHits = opposedResult.faces.filter((f) => f < threshold).length;
        } else {
          opposedHits = opposedResult.faces.filter((f) => f >= threshold).length;
        }
      } else {
        opposedHits = 0;
      }
    }

    // Stage 5: Net hits
    const netHits =
      opposedHits !== null ? Math.max(0, hits - opposedHits) : hits;

    // Stage 6: Classify — use faces.length to detect whether any dice were rolled
    const mergedTiers = step.tiers ?? effectiveConfig.tiers;
    const tier = faces.length === 0 ? 'miss' : classify(netHits, mergedTiers);

    return Object.freeze({
      hits,
      opposedHits,
      netHits,
      tier,
      mechanic,
      faces,
      pool: resultPool,
      rolls,
    });
  }
}
