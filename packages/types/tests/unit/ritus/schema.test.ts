import { describe, it, expect } from 'vitest'
import { RitusSchema, RitusMechanicSchema, RitusTiersSchema } from '../../../src/ritus/schema.js'
import { isRitus } from '../../../src/ritus/guards.js'

const validRitus = {
  id: 'sr6-standard',
  name: 'Shadowrun 6E Standard',
  mechanic: 'pool-count' as const,
  sides: 6,
  threshold: 5,
  tiers: { hit: 1 },
}

// ─── Boundary ────────────────────────────────────────────────────────────────
describe('Boundary', () => {
  it('threshold of 1 (minimum positive integer) is accepted', () => {
    expect(RitusSchema.safeParse({ ...validRitus, threshold: 1 }).success).toBe(true)
  })

  it('threshold of 0 is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, threshold: 0 })
    expect(result.success).toBe(false)
  })

  it('threshold of -1 is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, threshold: -1 })
    expect(result.success).toBe(false)
  })

  it('non-integer threshold (5.5) is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, threshold: 5.5 })
    expect(result.success).toBe(false)
  })

  it('id of exactly one character is accepted', () => {
    expect(RitusSchema.safeParse({ ...validRitus, id: 'x' }).success).toBe(true)
  })

  it('empty id is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, id: '' })
    expect(result.success).toBe(false)
  })

  it('empty name is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, name: '' })
    expect(result.success).toBe(false)
  })

  it('tiers.hit of 0 (zero net hits = hit) is accepted', () => {
    expect(RitusSchema.safeParse({ ...validRitus, tiers: { hit: 0 } }).success).toBe(true)
  })

  it('single-entry tiers vocabulary is accepted', () => {
    expect(RitusSchema.safeParse({ ...validRitus, tiers: { success: 1 } }).success).toBe(true)
  })

  it('empty tiers object is rejected (at least one entry required)', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: {} })
    expect(result.success).toBe(false)
  })

  it('tier name of a single lowercase letter is accepted', () => {
    expect(RitusTiersSchema.safeParse({ x: 1 }).success).toBe(true)
  })

  it('tier name with digits and hyphens is accepted', () => {
    expect(RitusTiersSchema.safeParse({ 'strong-hit-2': 3, hit: 1 }).success).toBe(true)
  })

  it('tier name starting with a digit is rejected', () => {
    expect(RitusTiersSchema.safeParse({ '2hit': 1 }).success).toBe(false)
  })

  it('tier name starting with a hyphen is rejected', () => {
    expect(RitusTiersSchema.safeParse({ '-hit': 1 }).success).toBe(false)
  })

  it('tier name with uppercase letters is rejected', () => {
    expect(RitusTiersSchema.safeParse({ Critical: 4, hit: 1 }).success).toBe(false)
  })

  it('tier name with spaces is rejected', () => {
    expect(RitusTiersSchema.safeParse({ 'strong hit': 4, hit: 1 }).success).toBe(false)
  })

  it('two tiers exactly one threshold apart are accepted', () => {
    expect(RitusTiersSchema.safeParse({ hit: 1, strong: 2 }).success).toBe(true)
  })
})

// ─── Scenario ─────────────────────────────────────────────────────────────────
describe('Scenario', () => {
  it('valid minimal Ritus (only required fields, hit-only tiers) passes validation', () => {
    const result = RitusSchema.safeParse(validRitus)
    expect(result.success).toBe(true)
  })

  it('valid Ritus with all three tiers passes validation', () => {
    const result = RitusSchema.safeParse({
      ...validRitus,
      tiers: { critical: 4, hit: 2, glancing: 1 },
    })
    expect(result.success).toBe(true)
  })

  it.each([
    'standard', 'pool-count', 'pool-sum', 'exploding', 'step-die',
    'roll-under', 'target-number', 'drama-die', 'custom',
  ])('mechanic "%s" is accepted', (mechanic) => {
    expect(RitusSchema.safeParse({ ...validRitus, mechanic }).success).toBe(true)
  })

  it('advantage-disadvantage with keepMode is accepted', () => {
    expect(RitusSchema.safeParse({
      ...validRitus, mechanic: 'advantage-disadvantage', keepMode: 'highest',
    }).success).toBe(true)
  })

  it('advantage-disadvantage without keepMode is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, mechanic: 'advantage-disadvantage' })
    expect(result.success).toBe(false)
  })

  it('invalid mechanic string is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, mechanic: 'exploding-dice' })
    expect(result.success).toBe(false)
  })

  it('sides of 6 is accepted', () => {
    expect(RitusSchema.safeParse({ ...validRitus, sides: 6 }).success).toBe(true)
  })

  it('sides of 2 (minimum) is accepted', () => {
    expect(RitusSchema.safeParse({ ...validRitus, sides: 2 }).success).toBe(true)
  })

  it('sides of 1 is rejected', () => {
    expect(RitusSchema.safeParse({ ...validRitus, sides: 1 }).success).toBe(false)
  })

  it('exploding mechanic without explicit explodes defaults explodes to true', () => {
    const result = RitusSchema.safeParse({ ...validRitus, mechanic: 'exploding' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.explodes).toBe(true)
  })

  it('pool-count mechanic without explicit explodes defaults explodes to false', () => {
    const result = RitusSchema.safeParse({ ...validRitus, mechanic: 'pool-count' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.explodes).toBe(false)
  })

  it('exploding mechanic with explicit explodes: false overrides the default', () => {
    const result = RitusSchema.safeParse({ ...validRitus, mechanic: 'exploding', explodes: false })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.explodes).toBe(false)
  })

  it('shadowrun vocabulary {miss:0,hit:1,strong:4,exceptional:6} round-trips WITHOUT loss', () => {
    // Regression for Officina finding 2: the old fixed-triple schema silently
    // stripped custom tier names. The full vocabulary must survive parsing.
    const tiers = { miss: 0, hit: 1, strong: 4, exceptional: 6 }
    const result = RitusSchema.safeParse({ ...validRitus, tiers })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tiers).toEqual(tiers)
    }
  })

  it('duplicate threshold values are rejected (ambiguous tier resolution)', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { hit: 1, strong: 1 } })
    expect(result.success).toBe(false)
  })

  it('unknown top-level Ritus key is rejected loudly (strict object)', () => {
    const result = RitusSchema.safeParse({ ...validRitus, bonusDice: 2 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === 'unrecognized_keys')).toBe(true)
    }
  })

  it('tiers with a single hit entry is accepted', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { hit: 2 } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tiers).toEqual({ hit: 2 })
    }
  })

  it('isRitus guard returns true for a valid Ritus object', () => {
    expect(isRitus(validRitus)).toBe(true)
  })

  it('isRitus guard returns false for an invalid object', () => {
    expect(isRitus({ id: '', mechanic: 'pool-count', threshold: 0, tiers: {} })).toBe(false)
  })

  it('isRitus guard returns false for null', () => {
    expect(isRitus(null)).toBe(false)
  })

  it('isRitus guard returns false for a plain string', () => {
    expect(isRitus('not-a-ritus')).toBe(false)
  })
})

// ─── Failure ──────────────────────────────────────────────────────────────────
describe('Failure', () => {
  it('missing id field produces a validation error on path "id"', () => {
    const result = RitusSchema.safeParse({ ...validRitus, id: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('id')
    }
  })

  it('missing name field produces a validation error on path "name"', () => {
    const result = RitusSchema.safeParse({ ...validRitus, name: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('name')
    }
  })

  it('missing mechanic field produces a validation error on path "mechanic"', () => {
    const result = RitusSchema.safeParse({ ...validRitus, mechanic: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('mechanic')
    }
  })

  it('missing threshold field produces a validation error on path "threshold"', () => {
    const result = RitusSchema.safeParse({ ...validRitus, threshold: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('threshold')
    }
  })

  it('missing tiers field produces a validation error on path "tiers"', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('tiers')
    }
  })

  it('duplicate threshold reports error path at the second duplicate tier name', () => {
    const result = RitusTiersSchema.safeParse({ hit: 2, strong: 2 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('strong')
      expect(result.error.issues[0]!.message).toContain('unique')
    }
  })

  it('empty tiers produces an at-least-one-entry error', () => {
    const result = RitusTiersSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('at least one')
    }
  })

  it('non-slug tier name reports a key validation error', () => {
    const result = RitusTiersSchema.safeParse({ CRIT: 4 })
    expect(result.success).toBe(false)
  })

  it('non-integer tiers.hit is rejected', () => {
    const result = RitusTiersSchema.safeParse({ hit: 1.5 })
    expect(result.success).toBe(false)
  })

  it('negative tiers.hit is rejected', () => {
    const result = RitusTiersSchema.safeParse({ hit: -1 })
    expect(result.success).toBe(false)
  })

  it('RitusMechanicSchema rejects unknown string with enum error', () => {
    const result = RitusMechanicSchema.safeParse('d20-vs-dc')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]!.code).toBe('invalid_enum_value')
    }
  })
})

// ─── Combinatorial ────────────────────────────────────────────────────────────
describe('Combinatorial', () => {
  it('all non-advantage mechanics × threshold 1 each produce valid Ritus objects', () => {
    const mechanics = [
      'standard', 'pool-count', 'pool-sum', 'exploding',
      'step-die', 'roll-under', 'target-number', 'drama-die', 'custom',
    ] as const
    for (const mechanic of mechanics) {
      const result = RitusSchema.safeParse({ ...validRitus, mechanic, threshold: 1 })
      expect(result.success, `mechanic ${mechanic} should be valid`).toBe(true)
    }
  })

  it('classic triple vocabulary (critical/hit/glancing) with distinct thresholds is accepted', () => {
    for (const [critical, hit, glancing] of [
      [5, 3, 1],
      [10, 5, 0],
      [3, 2, 1],
      [100, 50, 25],
    ] as [number, number, number][]) {
      const result = RitusTiersSchema.safeParse({ critical, hit, glancing })
      expect(result.success, `critical=${critical} hit=${hit} glancing=${glancing}`).toBe(true)
    }
  })

  it('arbitrary vocabularies with unique thresholds are accepted', () => {
    const vocabularies: Record<string, number>[] = [
      { miss: 0, hit: 1, strong: 4, exceptional: 6 },
      { miss: 0, notice: 1, detail: 3, pinpoint: 5 },
      { miss: 0, partial: 2, full: 4 },
      { miss: 0, shaken: 1, steady: 3, unflappable: 5 },
      { fail: 0, 'near-miss': 1, success: 2, 'crit-2': 5 },
    ]
    for (const tiers of vocabularies) {
      const result = RitusTiersSchema.safeParse(tiers)
      expect(result.success, `vocabulary ${JSON.stringify(tiers)} should be valid`).toBe(true)
      if (result.success) expect(result.data).toEqual(tiers)
    }
  })

  it('any vocabulary containing duplicate threshold values is rejected', () => {
    const vocabularies: Record<string, number>[] = [
      { hit: 1, strong: 1 },
      { miss: 0, hit: 2, strong: 2, exceptional: 6 },
      { a: 3, b: 3, c: 3 },
    ]
    for (const tiers of vocabularies) {
      const result = RitusTiersSchema.safeParse(tiers)
      expect(result.success, `vocabulary ${JSON.stringify(tiers)} should fail`).toBe(false)
    }
  })

  it('Ritus with various valid thresholds and mechanics produces correct inferred data', () => {
    const mechanics = ['pool-count', 'pool-sum', 'exploding', 'roll-under'] as const
    const thresholds = [1, 3, 6, 10]
    for (const mechanic of mechanics) {
      for (const threshold of thresholds) {
        const input = { ...validRitus, mechanic, threshold }
        const result = RitusSchema.safeParse(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.mechanic).toBe(mechanic)
          expect(result.data.threshold).toBe(threshold)
        }
      }
    }
  })

  it('three tiers sharing one threshold produce one issue per duplicate', () => {
    // hit and glancing both duplicate critical's threshold — two duplicate issues
    const result = RitusTiersSchema.safeParse({ critical: 2, hit: 2, glancing: 2 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
    }
  })
})
