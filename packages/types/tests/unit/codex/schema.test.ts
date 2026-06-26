import { describe, it, expect } from 'vitest'
import { CodexSchema } from '../../../src/codex/schema.js'
import { isCodex } from '../../../src/codex/guards.js'

const validCodex = {
  systemId: 'sr6',
  attributes: ['agility', 'strength', 'logic'],
  skills: ['athletics', 'stealth', 'hacking'],
  derived: ['initiative', 'composure'],
  damageTypes: ['physical', 'stun'],
  currencies: ['nuyen', 'karma'],
}

// ─── Boundary ────────────────────────────────────────────────────────────────
describe('Boundary', () => {
  it('systemId of exactly one character is accepted', () => {
    expect(CodexSchema.safeParse({ ...validCodex, systemId: 'x' }).success).toBe(true)
  })

  it('empty systemId is rejected', () => {
    const result = CodexSchema.safeParse({ ...validCodex, systemId: '' })
    expect(result.success).toBe(false)
  })

  it('all arrays empty is accepted', () => {
    const result = CodexSchema.safeParse({
      systemId: 'minimal',
      attributes: [],
      skills: [],
      derived: [],
      damageTypes: [],
      currencies: [],
    })
    expect(result.success).toBe(true)
  })

  it('single slug in one array only is accepted', () => {
    const result = CodexSchema.safeParse({
      systemId: 'minimal',
      attributes: ['body'],
      skills: [],
      derived: [],
      damageTypes: [],
      currencies: [],
    })
    expect(result.success).toBe(true)
  })

  it('single slug repeated in the same array twice is treated as a duplicate and rejected', () => {
    // The global seen map catches within-array duplicates too
    const result = CodexSchema.safeParse({
      systemId: 'test',
      attributes: ['body', 'body'],
      skills: [],
      derived: [],
      damageTypes: [],
      currencies: [],
    })
    expect(result.success).toBe(false)
  })
})

// ─── Scenario ─────────────────────────────────────────────────────────────────
describe('Scenario', () => {
  it('valid codex with all arrays populated passes validation', () => {
    const result = CodexSchema.safeParse(validCodex)
    expect(result.success).toBe(true)
  })

  it('inferred data matches input when valid', () => {
    const result = CodexSchema.safeParse(validCodex)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.systemId).toBe('sr6')
      expect(result.data.attributes).toEqual(['agility', 'strength', 'logic'])
      expect(result.data.skills).toEqual(['athletics', 'stealth', 'hacking'])
    }
  })

  it('slug in attributes and skills simultaneously is rejected', () => {
    const result = CodexSchema.safeParse({
      ...validCodex,
      attributes: ['agility'],
      skills: ['agility'],
    })
    expect(result.success).toBe(false)
  })

  it('slug in attributes and derived simultaneously is rejected', () => {
    const result = CodexSchema.safeParse({
      ...validCodex,
      attributes: ['composure'],
      derived: ['composure'],
    })
    expect(result.success).toBe(false)
  })

  it('slug in skills and damageTypes simultaneously is rejected', () => {
    const result = CodexSchema.safeParse({
      ...validCodex,
      skills: ['fire'],
      damageTypes: ['fire'],
    })
    expect(result.success).toBe(false)
  })

  it('slug in damageTypes and currencies simultaneously is rejected', () => {
    const result = CodexSchema.safeParse({
      ...validCodex,
      damageTypes: ['gold'],
      currencies: ['gold'],
    })
    expect(result.success).toBe(false)
  })

  it('isCodex guard returns true for a valid Codex object', () => {
    expect(isCodex(validCodex)).toBe(true)
  })

  it('isCodex guard returns false for an invalid object (empty systemId)', () => {
    expect(isCodex({ ...validCodex, systemId: '' })).toBe(false)
  })

  it('isCodex guard returns false for null', () => {
    expect(isCodex(null)).toBe(false)
  })

  it('isCodex guard returns false for a plain string', () => {
    expect(isCodex('not-a-codex')).toBe(false)
  })

  it('isCodex guard returns false when cross-array slug collision exists', () => {
    expect(
      isCodex({ ...validCodex, attributes: ['agility'], skills: ['agility'] }),
    ).toBe(false)
  })
})

// ─── Failure ──────────────────────────────────────────────────────────────────
describe('Failure', () => {
  it('missing systemId produces a validation error on path "systemId"', () => {
    const result = CodexSchema.safeParse({ ...validCodex, systemId: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('systemId')
    }
  })

  it('missing attributes produces a validation error on path "attributes"', () => {
    const result = CodexSchema.safeParse({ ...validCodex, attributes: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('attributes')
    }
  })

  it('missing skills produces a validation error on path "skills"', () => {
    const result = CodexSchema.safeParse({ ...validCodex, skills: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('skills')
    }
  })

  it('missing derived produces a validation error on path "derived"', () => {
    const result = CodexSchema.safeParse({ ...validCodex, derived: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('derived')
    }
  })

  it('missing damageTypes produces a validation error on path "damageTypes"', () => {
    const result = CodexSchema.safeParse({ ...validCodex, damageTypes: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('damageTypes')
    }
  })

  it('missing currencies produces a validation error on path "currencies"', () => {
    const result = CodexSchema.safeParse({ ...validCodex, currencies: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('currencies')
    }
  })

  it('cross-field collision error reports the path of the duplicate field', () => {
    const result = CodexSchema.safeParse({
      ...validCodex,
      attributes: ['agility'],
      skills: ['agility'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('skills')
    }
  })

  it('non-string value in attributes array is rejected', () => {
    const result = CodexSchema.safeParse({ ...validCodex, attributes: [42] })
    expect(result.success).toBe(false)
  })

  it('non-array value for skills is rejected', () => {
    const result = CodexSchema.safeParse({ ...validCodex, skills: 'hacking' })
    expect(result.success).toBe(false)
  })
})

// ─── Combinatorial ────────────────────────────────────────────────────────────
describe('Combinatorial', () => {
  it('slug collision detected across all pairs of fields', () => {
    const fieldPairs: [string, string][] = [
      ['attributes', 'skills'],
      ['attributes', 'derived'],
      ['attributes', 'damageTypes'],
      ['attributes', 'currencies'],
      ['skills', 'derived'],
      ['skills', 'damageTypes'],
      ['skills', 'currencies'],
      ['derived', 'damageTypes'],
      ['derived', 'currencies'],
      ['damageTypes', 'currencies'],
    ]
    for (const [fieldA, fieldB] of fieldPairs) {
      const input = {
        systemId: 'test',
        attributes: [],
        skills: [],
        derived: [],
        damageTypes: [],
        currencies: [],
        [fieldA]: ['collision-slug'],
        [fieldB]: ['collision-slug'],
      }
      const result = CodexSchema.safeParse(input)
      expect(result.success, `${fieldA} vs ${fieldB} collision should fail`).toBe(false)
    }
  })

  it('multiple collisions across fields produce multiple issues', () => {
    const result = CodexSchema.safeParse({
      systemId: 'test',
      attributes: ['dup-a', 'dup-b'],
      skills: ['dup-a'],
      derived: ['dup-b'],
      damageTypes: [],
      currencies: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('no collision when all slugs are unique across all fields', () => {
    const result = CodexSchema.safeParse({
      systemId: 'full',
      attributes: ['attr-1', 'attr-2'],
      skills: ['skill-1', 'skill-2'],
      derived: ['derived-1'],
      damageTypes: ['dmg-1', 'dmg-2'],
      currencies: ['cur-1'],
    })
    expect(result.success).toBe(true)
  })

  it('various valid systemId strings with non-empty arrays all pass', () => {
    const systemIds = ['sr6', 'dnd5e', 'pf2e', 'CoC7th', '1']
    for (const systemId of systemIds) {
      const result = CodexSchema.safeParse({
        systemId,
        attributes: [`${systemId}-attr`],
        skills: [`${systemId}-skill`],
        derived: [],
        damageTypes: [],
        currencies: [],
      })
      expect(result.success, `systemId "${systemId}" should be valid`).toBe(true)
    }
  })

  it('same slug appearing in three different arrays produces three collision issues', () => {
    const result = CodexSchema.safeParse({
      systemId: 'test',
      attributes: ['triple'],
      skills: ['triple'],
      derived: ['triple'],
      damageTypes: [],
      currencies: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
    }
  })
})
