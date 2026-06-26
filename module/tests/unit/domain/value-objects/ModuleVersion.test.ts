import { describe, it, expect } from 'vitest'
import { ModuleVersion } from '../../../../src/domain/value-objects/ModuleVersion'

describe('ModuleVersion.parse', () => {
  // ---------- Boundary ----------

  it('parses "0.0.0"', () => {
    expect(() => ModuleVersion.parse('0.0.0')).not.toThrow()
  })

  it('parses "1.0.0"', () => {
    expect(() => ModuleVersion.parse('1.0.0')).not.toThrow()
  })

  it('parses "10.20.300"', () => {
    expect(() => ModuleVersion.parse('10.20.300')).not.toThrow()
  })

  it('parses version with leading/trailing whitespace (trimmed)', () => {
    expect(() => ModuleVersion.parse('  1.2.3  ')).not.toThrow()
  })

  // ---------- Failure: invalid format ----------

  it('throws for "v1.0.0" (v-prefix not allowed)', () => {
    expect(() => ModuleVersion.parse('v1.0.0')).toThrow()
  })

  it('throws for "1.0" (missing patch)', () => {
    expect(() => ModuleVersion.parse('1.0')).toThrow()
  })

  it('throws for "1" (only major)', () => {
    expect(() => ModuleVersion.parse('1')).toThrow()
  })

  it('throws for "1.0.0.0" (four parts)', () => {
    expect(() => ModuleVersion.parse('1.0.0.0')).toThrow()
  })

  it('throws for "1.0.a" (non-numeric patch)', () => {
    expect(() => ModuleVersion.parse('1.0.a')).toThrow()
  })

  it('throws for "1.b.0" (non-numeric minor)', () => {
    expect(() => ModuleVersion.parse('1.b.0')).toThrow()
  })

  it('throws for empty string', () => {
    expect(() => ModuleVersion.parse('')).toThrow()
  })

  it('throws for "latest"', () => {
    expect(() => ModuleVersion.parse('latest')).toThrow()
  })

  it('throws for negative component "-1.0.0"', () => {
    expect(() => ModuleVersion.parse('-1.0.0')).toThrow()
  })

  it('throws for "1.0.0-alpha" (pre-release suffix not supported)', () => {
    expect(() => ModuleVersion.parse('1.0.0-alpha')).toThrow()
  })
})

describe('ModuleVersion.isNewerThan', () => {
  // ---------- Scenario: Outdated module detected ----------

  it('returns true when patch is higher (0.2.0 vs 0.3.1)', () => {
    const installed = ModuleVersion.parse('0.2.0')
    const latest = ModuleVersion.parse('0.3.1')
    expect(latest.isNewerThan(installed)).toBe(true)
  })

  // ---------- Scenario: Up-to-date module not flagged ----------

  it('returns false when versions are equal (1.0.0 vs 1.0.0)', () => {
    const a = ModuleVersion.parse('1.0.0')
    const b = ModuleVersion.parse('1.0.0')
    expect(a.isNewerThan(b)).toBe(false)
  })

  // ---------- Boundary ----------

  it('returns true when major is higher (2.0.0 vs 1.9.9)', () => {
    const installed = ModuleVersion.parse('1.9.9')
    const latest = ModuleVersion.parse('2.0.0')
    expect(latest.isNewerThan(installed)).toBe(true)
  })

  it('returns false when major is lower', () => {
    const a = ModuleVersion.parse('1.0.0')
    const b = ModuleVersion.parse('2.0.0')
    expect(a.isNewerThan(b)).toBe(false)
  })

  it('returns true when only minor is higher (1.2.0 vs 1.1.9)', () => {
    const installed = ModuleVersion.parse('1.1.9')
    const latest = ModuleVersion.parse('1.2.0')
    expect(latest.isNewerThan(installed)).toBe(true)
  })

  it('returns false when minor is lower despite higher patch', () => {
    const a = ModuleVersion.parse('1.1.9')
    const b = ModuleVersion.parse('1.2.0')
    expect(a.isNewerThan(b)).toBe(false)
  })

  it('returns true when only patch is higher (0.3.1 vs 0.3.0)', () => {
    const installed = ModuleVersion.parse('0.3.0')
    const latest = ModuleVersion.parse('0.3.1')
    expect(latest.isNewerThan(installed)).toBe(true)
  })

  it('returns false when patch is lower', () => {
    const a = ModuleVersion.parse('0.3.0')
    const b = ModuleVersion.parse('0.3.1')
    expect(a.isNewerThan(b)).toBe(false)
  })

  it('returns false when both are 0.0.0', () => {
    const a = ModuleVersion.parse('0.0.0')
    const b = ModuleVersion.parse('0.0.0')
    expect(a.isNewerThan(b)).toBe(false)
  })

  // ---------- Combinatorial ----------

  it('isNewerThan is asymmetric: a > b means b is NOT > a', () => {
    const a = ModuleVersion.parse('1.2.3')
    const b = ModuleVersion.parse('1.2.2')
    expect(a.isNewerThan(b)).toBe(true)
    expect(b.isNewerThan(a)).toBe(false)
  })
})

describe('ModuleVersion.equals', () => {
  it('returns true for identical versions', () => {
    const a = ModuleVersion.parse('1.2.3')
    const b = ModuleVersion.parse('1.2.3')
    expect(a.equals(b)).toBe(true)
  })

  it('returns false when major differs', () => {
    const a = ModuleVersion.parse('1.0.0')
    const b = ModuleVersion.parse('2.0.0')
    expect(a.equals(b)).toBe(false)
  })

  it('returns false when minor differs', () => {
    const a = ModuleVersion.parse('1.1.0')
    const b = ModuleVersion.parse('1.2.0')
    expect(a.equals(b)).toBe(false)
  })

  it('returns false when patch differs', () => {
    const a = ModuleVersion.parse('1.0.1')
    const b = ModuleVersion.parse('1.0.2')
    expect(a.equals(b)).toBe(false)
  })

  it('is symmetric: equals(a, b) implies equals(b, a)', () => {
    const a = ModuleVersion.parse('3.4.5')
    const b = ModuleVersion.parse('3.4.5')
    expect(a.equals(b)).toBe(b.equals(a))
  })
})

describe('ModuleVersion.toString', () => {
  it('returns "1.2.3" for ModuleVersion.parse("1.2.3")', () => {
    expect(ModuleVersion.parse('1.2.3').toString()).toBe('1.2.3')
  })

  it('returns "0.0.0" for ModuleVersion.parse("0.0.0")', () => {
    expect(ModuleVersion.parse('0.0.0').toString()).toBe('0.0.0')
  })

  it('strips leading whitespace from the result', () => {
    expect(ModuleVersion.parse('  2.10.0  ').toString()).toBe('2.10.0')
  })
})
