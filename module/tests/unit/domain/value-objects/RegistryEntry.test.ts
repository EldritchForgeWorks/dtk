import { describe, it, expect } from 'vitest'
import { parseRegistryEntry, RegistryEntrySchema } from '../../../../src/domain/value-objects/RegistryEntry'
import { makeRegistryEntry } from '../../helpers/fixtures'

describe('RegistryEntrySchema', () => {
  // ---------- Scenario (spec §Registry entry shape) ----------

  it('accepts a valid free module entry', () => {
    const entry = makeRegistryEntry({ tier: 'free' })
    expect(() => parseRegistryEntry(entry)).not.toThrow()
  })

  it('accepts a valid premium module entry', () => {
    const entry = makeRegistryEntry({ tier: 'premium' })
    expect(() => parseRegistryEntry(entry)).not.toThrow()
  })

  it('accepts entry without optional changelogUrl', () => {
    const entry = makeRegistryEntry()
    delete (entry as Record<string, unknown>).changelogUrl
    expect(() => parseRegistryEntry(entry)).not.toThrow()
  })

  it('accepts entry with a valid changelogUrl', () => {
    const entry = makeRegistryEntry({ changelogUrl: 'https://example.com/changelog' })
    const result = parseRegistryEntry(entry)
    expect(result.changelogUrl).toBe('https://example.com/changelog')
  })

  it('accepts entry with empty dependencies array', () => {
    const entry = makeRegistryEntry({ dependencies: [] })
    const result = parseRegistryEntry(entry)
    expect(result.dependencies).toEqual([])
  })

  it('accepts entry with multiple dependencies', () => {
    const entry = makeRegistryEntry({ dependencies: ['dtk', 'dtk-alea'] })
    const result = parseRegistryEntry(entry)
    expect(result.dependencies).toEqual(['dtk', 'dtk-alea'])
  })

  // ---------- Scenario: Entry missing manifestUrl rejected ----------

  it('rejects entry missing manifestUrl', () => {
    const raw = { ...makeRegistryEntry() }
    delete (raw as Record<string, unknown>).manifestUrl
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  // ---------- Scenario: Invalid tier rejected ----------

  it('rejects tier "trial"', () => {
    const raw = { ...makeRegistryEntry(), tier: 'trial' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects tier "paid"', () => {
    const raw = { ...makeRegistryEntry(), tier: 'paid' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects empty string tier', () => {
    const raw = { ...makeRegistryEntry(), tier: '' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  // ---------- Scenario: Invalid semver latestVersion rejected ----------

  it('rejects latestVersion "latest" (non-semver)', () => {
    const raw = { ...makeRegistryEntry(), latestVersion: 'latest' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects latestVersion "v1.0.0" (prefixed semver)', () => {
    const raw = { ...makeRegistryEntry(), latestVersion: 'v1.0.0' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects latestVersion "1.0" (missing patch)', () => {
    const raw = { ...makeRegistryEntry(), latestVersion: '1.0' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects empty latestVersion', () => {
    const raw = { ...makeRegistryEntry(), latestVersion: '' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  // ---------- Boundary: required string fields ----------

  it('rejects empty id', () => {
    const raw = { ...makeRegistryEntry(), id: '' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects empty name', () => {
    const raw = { ...makeRegistryEntry(), name: '' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects non-URL manifestUrl', () => {
    const raw = { ...makeRegistryEntry(), manifestUrl: 'not-a-url' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects non-URL changelogUrl', () => {
    const raw = { ...makeRegistryEntry(), changelogUrl: 'not-a-url' }
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects missing id', () => {
    const raw = { ...makeRegistryEntry() }
    delete (raw as Record<string, unknown>).id
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects missing tier', () => {
    const raw = { ...makeRegistryEntry() }
    delete (raw as Record<string, unknown>).tier
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects missing latestVersion', () => {
    const raw = { ...makeRegistryEntry() }
    delete (raw as Record<string, unknown>).latestVersion
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects missing dependencies', () => {
    const raw = { ...makeRegistryEntry() }
    delete (raw as Record<string, unknown>).dependencies
    expect(() => parseRegistryEntry(raw)).toThrow()
  })

  it('rejects null input', () => {
    expect(() => parseRegistryEntry(null)).toThrow()
  })

  it('rejects non-object input', () => {
    expect(() => parseRegistryEntry('not-an-object')).toThrow()
  })

  // ---------- Combinatorial ----------

  it('parseRegistryEntry round-trips a valid entry', () => {
    const input = makeRegistryEntry({
      id: 'dtk-alea',
      name: 'DTK Alea',
      tier: 'premium',
      latestVersion: '2.3.4',
      manifestUrl: 'https://example.com/dtk-alea/module.json',
      description: 'Alea module.',
      dependencies: ['dtk', 'dtk-systema'],
      changelogUrl: 'https://example.com/dtk-alea/changelog',
    })
    const result = parseRegistryEntry(input)
    expect(result).toEqual(input)
  })

  it('RegistryEntrySchema.safeParse returns success for valid entry', () => {
    const result = RegistryEntrySchema.safeParse(makeRegistryEntry())
    expect(result.success).toBe(true)
  })

  it('RegistryEntrySchema.safeParse returns failure with error messages for invalid entry', () => {
    const result = RegistryEntrySchema.safeParse({ ...makeRegistryEntry(), tier: 'trial' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})
