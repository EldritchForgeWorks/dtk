import type { IDiceRoller } from '../../ports/IDiceRoller.js';
import type { EvaluationContext } from '../../ports/IExpressionDelegate.js';
import type { RollResult } from '../value-objects/RollResult.js';
import type { RitusConfig } from '../value-objects/RitusConfig.js';
import { ExpressionParser } from './ExpressionParser.js';
import { classify } from './TierResolver.js';

export interface RuleStep {
  type: 'rule';
  id: string;
  pool: string;
  opposed?: string;
  threshold?: number;
  tiers?: Record<string, number>;
  [key: string]: unknown;
}

export class RollResolver {
  private readonly roller: IDiceRoller;
  private readonly parser: ExpressionParser;

  constructor(roller: IDiceRoller, parser: ExpressionParser) {
    this.roller = roller;
    this.parser = parser;
  }

  resolve(
    step: RuleStep,
    context: EvaluationContext,
    ritusConfig: RitusConfig,
  ): RollResult {
    // Stage 1: Assemble pool
    const rawPool = this.parser.evaluate(step.pool, context);
    if (rawPool === null) {
      console.warn(
        `RollResolver: pool expression "${step.pool}" evaluated to null — treating as zero dice.`,
      );
    }
    const pool = rawPool === null ? 0 : Math.max(0, Math.floor(rawPool));

    // Stage 2+3: Roll dice and count hits
    const threshold = ritusConfig.threshold;
    let faces: number[] = [];
    let hits = 0;
    if (pool > 0) {
      faces = this.roller.roll(pool, 6);
      hits = faces.filter((f) => f >= threshold).length;
    }

    // Stage 4: Opposed roll
    let opposedHits: number | null = null;
    if (step.opposed) {
      const rawOpposed = this.parser.evaluate(step.opposed, context);
      const opposedPool =
        rawOpposed === null ? 0 : Math.max(0, Math.floor(rawOpposed));
      if (opposedPool > 0) {
        const opposedFaces = this.roller.roll(opposedPool, 6);
        opposedHits = opposedFaces.filter((f) => f >= threshold).length;
      } else {
        opposedHits = 0;
      }
    }

    // Stage 5: Net hits
    const netHits =
      opposedHits !== null ? Math.max(0, hits - opposedHits) : hits;

    // Stage 6: Classify
    const mergedTiers = step.tiers ?? ritusConfig.tiers;
    const tier = pool === 0 ? 'miss' : classify(netHits, mergedTiers);

    return Object.freeze({ hits, opposedHits, netHits, tier, faces, pool });
  }
}
