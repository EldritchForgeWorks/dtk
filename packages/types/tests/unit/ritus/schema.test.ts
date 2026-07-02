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

  it('tiers.critical exactly one above hit (critical = hit + 1) is accepted', () => {
    expect(
      RitusSchema.safeParse({ ...validRitus, tiers: { critical: 2, hit: 1 } }).success,
    ).toBe(true)
  })

  it('tiers.critical equal to hit is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { critical: 1, hit: 1 } })
    expect(result.success).toBe(false)
  })

  it('tiers.glancing exactly one below hit (glancing = hit - 1) is accepted', () => {
    expect(
      RitusSchema.safeParse({ ...validRitus, tiers: { hit: 2, glancing: 1 } }).success,
    ).toBe(true)
  })

  it('tiers.glancing equal to hit is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { hit: 1, glancing: 1 } })
    expect(result.success).toBe(false)
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

  it('Ritus without tiers.hit is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { critical: 4 } })
    expect(result.success).toBe(false)
  })

  it('critical less than hit is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { critical: 1, hit: 3 } })
    expect(result.success).toBe(false)
  })

  it('glancing greater than hit is rejected', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { hit: 2, glancing: 3 } })
    expect(result.success).toBe(false)
  })

  it('tiers with only hit is accepted (optional critical and glancing absent)', () => {
    const result = RitusSchema.safeParse({ ...validRitus, tiers: { hit: 2 } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tiers.critical).toBeUndefined()
      expect(result.data.tiers.glancing).toBeUndefined()
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

  it('critical equal to hit reports error path as ["critical"]', () => {
    const result = RitusTiersSchema.safeParse({ critical: 2, hit: 2 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('critical')
    }
  })

  it('glancing equal to hit reports error path as ["glancing"]', () => {
    const result = RitusTiersSchema.safeParse({ hit: 2, glancing: 2 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('glancing')
    }
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

  it('all three tiers present with valid ordering (critical > hit > glancing) is accepted', () => {
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

  it('critical <= hit with any hit value is rejected', () => {
    for (const hit of [1, 2, 5, 10]) {
      for (const critical of [0, 1, hit - 1, hit].filter((v) => v >= 0)) {
        const result = RitusTiersSchema.safeParse({ critical, hit })
        if (critical <= hit) {
          expect(result.success, `critical=${critical} hit=${hit} should fail`).toBe(false)
        }
      }
    }
  })

  it('glancing >= hit with any hit value is rejected', () => {
    for (const hit of [1, 2, 5]) {
      for (const glancing of [hit, hit + 1, hit + 5]) {
        const result = RitusTiersSchema.safeParse({ hit, glancing })
        expect(result.success, `glancing=${glancing} hit=${hit} should fail`).toBe(false)
      }
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

  it('both critical and glancing violations together produce two issues', () => {
    // critical = hit (violation) and glancing = hit (violation) simultaneously
    const result = RitusTiersSchema.safeParse({ critical: 2, hit: 2, glancing: 2 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
    }
  })
})
