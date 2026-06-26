import { describe, it, expect, vi } from 'vitest';
import { ExpressionParser } from '../../../../src/domain/services/ExpressionParser.js';
import { NullExpressionDelegate } from '../../../../src/adapters/in-memory/NullExpressionDelegate.js';
import type { IExpressionDelegate, EvaluationContext } from '../../../../src/ports/IExpressionDelegate.js';
import { buildBareEvalContext } from '../../../helpers/buildContext.js';

function makeCtx(overrides?: Partial<EvaluationContext>): EvaluationContext {
  return buildBareEvalContext(overrides);
}

// Boundary

describe('ExpressionParser — Boundary', () => {
  it('evaluates a pure numeric literal', () => {
    const parser = new ExpressionParser();
    expect(parser.evaluate('7', makeCtx())).toBe(7);
  });

  it('evaluates zero literal', () => {
    const parser = new ExpressionParser();
    expect(parser.evaluate('0', makeCtx())).toBe(0);
  });

  it('evaluates a float literal', () => {
    const parser = new ExpressionParser();
    expect(parser.evaluate('3.5', makeCtx())).toBe(3.5);
  });

  it('evaluatePool floors a float result to integer', () => {
    const parser = new ExpressionParser();
    expect(parser.evaluatePool('7.8', makeCtx())).toBe(7);
  });

  it('evaluatePool coerces null expression result to 0', () => {
    const parser = new ExpressionParser();
    // Unknown scope returns null → evaluatePool returns 0
    expect(parser.evaluatePool('@unknown.path', makeCtx())).toBe(0);
  });

  it('evaluatePool clamps negative results to 0', () => {
    const parser = new ExpressionParser();
    // Negative literal
    // Note: applyArithmetic sees "-2" as operator then "2", not a negative number
    // Use an expression that yields negative: we need a subtraction
    // @initiator.system.agility - 10 = 4 - 10 = -6 → evaluatePool = 0
    const ctx = makeCtx();
    expect(parser.evaluatePool('@initiator.system.agility - 10', ctx)).toBe(0);
  });
});

// Scope resolution

describe('ExpressionParser — Scope resolution', () => {
  it('@initiator.system.agility resolves from initiator snapshot', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx(); // system.agility = 4
    expect(parser.evaluate('@initiator.system.agility', ctx)).toBe(4);
  });

  it('@initiator.system.strength resolves from initiator snapshot', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx(); // system.strength = 3
    expect(parser.evaluate('@initiator.system.strength', ctx)).toBe(3);
  });

  it('@target.system.agility resolves when target is set', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx({
      target: { id: 'target-1', name: 'Target', system: { agility: 7 } },
    });
    expect(parser.evaluate('@target.system.agility', ctx)).toBe(7);
  });

  it('@target.system.agility returns null when no target', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx({ target: null });
    expect(parser.evaluate('@target.system.agility', ctx)).toBeNull();
  });

  it('@item.system.damage resolves when item is set', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx({
      item: { id: 'weapon-1', name: 'Gun', system: { damage: 9 } },
    });
    expect(parser.evaluate('@item.system.damage', ctx)).toBe(9);
  });

  it('@item.system.damage returns null when no item', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx({ item: null });
    expect(parser.evaluate('@item.system.damage', ctx)).toBeNull();
  });

  it('@combat.round resolves from combat snapshot', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx({
      combat: { round: 3, turn: 1, combatantId: 'c1' },
    });
    expect(parser.evaluate('@combat.round', ctx)).toBe(3);
  });

  it('@combat scope returns null when no combat', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx({ combat: null });
    expect(parser.evaluate('@combat.round', ctx)).toBeNull();
  });

  it('@steps cross-step reference resolves netHits', () => {
    const parser = new ExpressionParser();
    const stepOutputs = new Map<string, unknown>([
      ['attack', { hits: 4, opposedHits: null, netHits: 3, tier: 'hit', faces: [5, 6, 5, 5], pool: 6 }],
    ]);
    const ctx = makeCtx({ stepOutputs });
    expect(parser.evaluate('@steps.attack.netHits', ctx)).toBe(3);
  });

  it('@steps reference to skipped (null) step returns null', () => {
    const parser = new ExpressionParser();
    const stepOutputs = new Map<string, unknown>([['cover', null]]);
    const ctx = makeCtx({ stepOutputs });
    expect(parser.evaluate('@steps.cover.netHits', ctx)).toBeNull();
  });

  it('unknown scope returns null', () => {
    const parser = new ExpressionParser();
    expect(parser.evaluate('@alien.field', makeCtx())).toBeNull();
  });

  it('unknown path on known scope returns null', () => {
    const parser = new ExpressionParser();
    expect(parser.evaluate('@initiator.system.nonexistentField', makeCtx())).toBeNull();
  });
});

// Arithmetic

describe('ExpressionParser — Arithmetic', () => {
  it('adds a reference and a literal', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx(); // agility=4
    expect(parser.evaluate('@initiator.system.agility + 2', ctx)).toBe(6);
  });

  it('subtracts a literal from a reference', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx(); // agility=4
    expect(parser.evaluate('@initiator.system.agility - 1', ctx)).toBe(3);
  });

  it('multiplies two references', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx(); // agility=4, strength=3
    expect(parser.evaluate('@initiator.system.agility * @initiator.system.strength', ctx)).toBe(12);
  });

  it('respects PEMDAS: multiplication before addition', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx({
      initiator: { id: 'a1', name: 'Actor', system: { strength: 4, skill: { melee: 3 } } },
    });
    // strength * 2 + skill.melee = 4 * 2 + 3 = 11
    expect(parser.evaluate('@initiator.system.strength * 2 + @initiator.system.skill.melee', ctx)).toBe(11);
  });

  it('evaluates step reference in arithmetic', () => {
    const parser = new ExpressionParser();
    const stepOutputs = new Map<string, unknown>([
      ['roll', { netHits: 5 }],
    ]);
    const ctx = makeCtx({ stepOutputs });
    // @steps.roll.netHits - 2 = 5 - 2 = 3
    expect(parser.evaluate('@steps.roll.netHits - 2', ctx)).toBe(3);
  });

  it('division by zero returns null and emits a warning', () => {
    const parser = new ExpressionParser();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parser.evaluate('@initiator.system.agility / 0', makeCtx())).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// Delegation

describe('ExpressionParser — Delegation', () => {
  it('complex expression delegates to IExpressionDelegate when wired', () => {
    const mockDelegate: IExpressionDelegate = {
      evaluate: vi.fn().mockReturnValue(42),
    };
    const parser = new ExpressionParser(mockDelegate);
    const ctx = makeCtx();
    const result = parser.evaluate('if(@cover, @dice - 2, @dice)', ctx);
    expect(result).toBe(42);
    expect(mockDelegate.evaluate).toHaveBeenCalledWith('if(@cover, @dice - 2, @dice)', ctx);
  });

  it('complex expression without delegate returns null and warns', () => {
    const parser = new ExpressionParser();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parser.evaluate('if(@cover, 3, 5)', makeCtx())).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('NullExpressionDelegate causes complex expressions to return null', () => {
    const parser = new ExpressionParser(new NullExpressionDelegate());
    const ctx = makeCtx();
    expect(parser.evaluate('if(@cover, 3, 5)', ctx)).toBeNull();
  });

  it('delegate returning a non-number causes evaluate to return null', () => {
    const mockDelegate: IExpressionDelegate = {
      evaluate: vi.fn().mockReturnValue('not-a-number'),
    };
    const parser = new ExpressionParser(mockDelegate);
    expect(parser.evaluate('if(@x, 1, 0)', makeCtx())).toBeNull();
  });

  it('logical operator expression triggers delegation', () => {
    const mockDelegate: IExpressionDelegate = {
      evaluate: vi.fn().mockReturnValue(8),
    };
    const parser = new ExpressionParser(mockDelegate);
    expect(parser.evaluate('@a && @b', makeCtx())).toBe(8);
    expect(mockDelegate.evaluate).toHaveBeenCalledOnce();
  });
});

// Combinatorial

describe('ExpressionParser — Combinatorial', () => {
  it('chained step reference used in arithmetic with initiator value', () => {
    const parser = new ExpressionParser();
    const stepOutputs = new Map<string, unknown>([
      ['firstroll', { netHits: 3 }],
    ]);
    const ctx = makeCtx({ stepOutputs });
    // @steps.firstroll.netHits + @initiator.system.agility = 3 + 4 = 7
    expect(parser.evaluate('@steps.firstroll.netHits + @initiator.system.agility', ctx)).toBe(7);
  });

  it('multi-operator expression preserves correct precedence', () => {
    const parser = new ExpressionParser();
    const ctx = makeCtx(); // agility=4, strength=3
    // agility + strength * 2 = 4 + (3 * 2) = 10
    expect(parser.evaluate('@initiator.system.agility + @initiator.system.strength * 2', ctx)).toBe(10);
  });

  it('resolveAny returns string tier from @steps reference', () => {
    const parser = new ExpressionParser();
    const stepOutputs = new Map<string, unknown>([
      ['attack', { tier: 'hit', netHits: 3 }],
    ]);
    const ctx = makeCtx({ stepOutputs });
    expect(parser.resolveAny('@steps.attack.tier', ctx)).toBe('hit');
  });

  it('resolveAny returns number for numeric literal', () => {
    const parser = new ExpressionParser();
    expect(parser.resolveAny('5', makeCtx())).toBe(5);
  });
});
