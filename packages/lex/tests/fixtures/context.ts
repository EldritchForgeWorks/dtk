import type { ExpressionContext } from '../../src/domain/ExpressionContext.js';

export function makeExpressionContext(overrides?: Record<string, unknown>): ExpressionContext {
  return { agility: 4, body: 3, willpower: 5, ...overrides } as ExpressionContext;
}

export function makeSr5eActorContext(): ExpressionContext {
  return {
    actor: {
      agility: 6,
      body: 4,
      willpower: 5,
      conditions: { prone: false, flanked: false },
    },
  } as unknown as ExpressionContext;
}

export function makeCombatContext(overrides?: Record<string, unknown>): ExpressionContext {
  return {
    combat: { flanked: false, outnumbered: false, cover: false },
    ...overrides,
  } as ExpressionContext;
}
