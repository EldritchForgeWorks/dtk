import { describe, it, expect } from 'vitest'
import { parseRegistryDocument, RegistryDocumentSchema } from '../../../../src/domain/value-objects/RegistryDocument'
import { makeRegistryEntry, makeRegistryDocument } from '../../helpers/fixtures'

describe('RegistryDocumentSchema', () => {
  // ---------- Scenario: Valid registry document accepted ----------

  it('accepts a valid registry document with one module', () => {
    const doc = makeRegistryDocument()
    expect(() => parseRegistryDocument(doc)).not.toThrow()
  })

  it('accepts a registry document with empty modules array', () => {
    const doc = makeRegistryDocument({ modules: [] })
    expect(() => parseRegistryDocument(doc)).not.toThrow()
  })

  it('accepts a registry document with multiple valid modules', () => {
    const doc = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-systema', tier: 'free' }),
        makeRegistryEntry({ id: 'dtk-alea', tier: 'premium', manifestUrl: 'https://example.com/dtk-alea/module.json' }),
      ],
    })
    expect(() => parseRegistryDocument(doc)).not.toThrow()
  })

  it('parseRegistryDocument returns the parsed document', () => {
    const doc = makeRegistryDocument()
    const result = parseRegistryDocument(doc)
    expect(result.version).toBe(1)
    expect(Array.isArray(result.modules)).toBe(true)
  })

  // ---------- Scenario: Unknown schema version rejected ----------

  it('rejects version 99 (unknown schema version)', () => {
    const raw = { version: 99, modules: [] }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  it('rejects version 2', () => {
    const raw = { version: 2, modules: [] }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  it('rejects version 0', () => {
    const raw = { version: 0, modules: [] }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  it('rejects string version "1"', () => {
    const raw = { version: '1', modules: [] }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  // ---------- Boundary ----------

  it('rejects missing version field', () => {
    const raw = { modules: [] }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  it('rejects missing modules field', () => {
    const raw = { version: 1 }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  it('rejects null input', () => {
    expect(() => parseRegistryDocument(null)).toThrow()
  })

  it('rejects array input instead of object', () => {
    expect(() => parseRegistryDocument([])).toThrow()
  })

  // ---------- Failure: invalid entries in modules array ----------

  it('rejects document whose modules array contains an invalid entry', () => {
    const raw = {
      version: 1,
      modules: [{ id: 'dtk-systema' }], // missing most required fields
    }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  it('rejects document whose modules array contains a null', () => {
    const raw = { version: 1, modules: [null] }
    expect(() => parseRegistryDocument(raw)).toThrow()
  })

  // ---------- Combinatorial ----------

  it('RegistryDocumentSchema.safeParse returns success for version 1', () => {
    const result = RegistryDocumentSchema.safeParse(makeRegistryDocument())
    expect(result.success).toBe(true)
  })

  it('RegistryDocumentSchema.safeParse returns failure for version 99 with error message', () => {
    const result = RegistryDocumentSchema.safeParse({ version: 99, modules: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('round-trips a valid document through parse', () => {
    const doc = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-systema' }),
        makeRegistryEntry({ id: 'dtk-alea', manifestUrl: 'https://example.com/dtk-alea/module.json' }),
      ],
    })
    const result = parseRegistryDocument(doc)
    expect(result.modules).toHaveLength(2)
    expect(result.modules[0].id).toBe('dtk-systema')
    expect(result.modules[1].id).toBe('dtk-alea')
  })
})
