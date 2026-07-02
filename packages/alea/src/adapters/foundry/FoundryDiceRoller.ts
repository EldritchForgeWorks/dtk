// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Roll: any;

import type { IDiceRoller, DiceResult } from '../../ports/IDiceRoller.js';

export class FoundryDiceRoller implements IDiceRoller {
  async roll(count: number, sides: number, opts?: import('../../ports/IDiceRoller.js').RollOpts): Promise<DiceResult> {
    let formula = `${count}d${sides}`;
    if (opts?.explodes) formula += 'x';
    // kh1 = keep highest 1; kl1 = keep lowest 1 (advantage-disadvantage mechanic)
    if (opts?.keepMode === 'highest') formula += 'kh1';
    else if (opts?.keepMode === 'lowest') formula += 'kl1';
    const r = new Roll(formula);
    await r.evaluate({ minimize: false, maximize: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faces = (r.terms[0] as any).results.map((res: any) => res.result as number);
    return { faces, raw: r };
  }
}
