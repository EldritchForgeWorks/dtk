// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Roll: any;

import type { IDiceRoller } from '../../ports/IDiceRoller.js';

export class FoundryDiceRoller implements IDiceRoller {
  roll(count: number, sides: number): number[] {
    const r = new Roll(`${count}d${sides}`);
    // evaluateSync is available in Foundry v12+
    if (typeof r.evaluateSync === 'function') {
      r.evaluateSync({ minimize: false, maximize: false });
    } else {
      // Fallback: synchronous via _evaluate (internal, Foundry v11 and earlier)
      r._evaluate({ minimize: false, maximize: false });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (r.terms[0] as any).results.map((res: any) => res.result as number);
  }
}
