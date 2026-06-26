import { describe, it, expect } from 'vitest'
import { DtkModuleEntry } from '../../../../src/domain/entities/DtkModuleEntry'

describe('DtkModuleEntry constructor', () => {
  // ---------- Boundary ----------

  it('constructs with valid id, version, and api', () => {
    expect(() => new DtkModuleEntry('dtk-systema', '1.0.0', {})).not.toThrow()
  })

  it('constructs with minimal valid id (single char)', () => {
    expect(() => new DtkModuleEntry('a', '0.1.0', {})).not.toThrow()
  })

  it('exposes id, version, and api as readonly properties', () => {
    const entry = new DtkModuleEntry('dtk-systema', '0.3.0', { foo: 'bar' })
    expect(entry.id).toBe('dtk-systema')
    expect(entry.version).toBe('0.3.0')
    expect(entry.api).toEqual({ foo: 'bar' })
  })

  it('starts with ready = false', () => {
    const entry = new DtkModuleEntry('dtk-systema', '1.0.0', {})
    expect(entry.ready).toBe(false)
  })

  // ---------- Failure: id validation ----------

  it('throws for empty id', () => {
    expect(() => new DtkModuleEntry('', '1.0.0', {})).toThrow()
  })

  it('throws for whitespace-only id', () => {
    expect(() => new DtkModuleEntry('   ', '1.0.0', {})).toThrow()
  })

  // ---------- Combinatorial: api types ----------

  it('accepts null as api', () => {
    expect(() => new DtkModuleEntry('dtk-alea', '1.0.0', null)).not.toThrow()
  })

  it('accepts a function as api', () => {
    const api = () => 42
    const entry = new DtkModuleEntry('dtk-alea', '1.0.0', api)
    expect(entry.api).toBe(api)
  })

  it('accepts a complex object as api', () => {
    const api = { method: () => 'result', value: 42, nested: { deep: true } }
    const entry = new DtkModuleEntry('dtk-systema', '2.0.0', api)
    expect(entry.api).toBe(api)
  })
})

describe('DtkModuleEntry.markReady', () => {
  // ---------- Scenario ----------

  it('transitions ready from false to true', () => {
    const entry = new DtkModuleEntry('dtk-systema', '1.0.0', {})
    expect(entry.ready).toBe(false)
    entry.markReady()
    expect(entry.ready).toBe(true)
  })

  // ---------- Boundary: idempotency ----------

  it('stays true after markReady called twice (idempotent)', () => {
    const entry = new DtkModuleEntry('dtk-systema', '1.0.0', {})
    entry.markReady()
    entry.markReady()
    expect(entry.ready).toBe(true)
  })

  it('stays true after markReady called many times', () => {
    const entry = new DtkModuleEntry('dtk-systema', '1.0.0', {})
    for (let i = 0; i < 10; i++) {
      entry.markReady()
    }
    expect(entry.ready).toBe(true)
  })

  // ---------- Combinatorial ----------

  it('two separate entries have independent ready states', () => {
    const a = new DtkModuleEntry('dtk-systema', '1.0.0', {})
    const b = new DtkModuleEntry('dtk-alea', '1.0.0', {})
    a.markReady()
    expect(a.ready).toBe(true)
    expect(b.ready).toBe(false)
  })
})
