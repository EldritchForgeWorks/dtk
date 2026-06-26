import { describe, it, expect } from 'vitest'
import { FormaRegistry } from '../../src/domain/FormaRegistry'
import { makeSimpleForma } from '../fixtures/forma'

describe('FormaRegistry — extra coverage', () => {
  it('register throws when forma is null', () => {
    const registry = new FormaRegistry()
    expect(() => registry.register('sys', null)).toThrow('non-null object')
  })

  it('register throws when forma is undefined', () => {
    const registry = new FormaRegistry()
    expect(() => registry.register('sys', undefined)).toThrow()
  })

  it('register throws when forma is a primitive (not an object)', () => {
    const registry = new FormaRegistry()
    expect(() => registry.register('sys', 42)).toThrow()
  })

  it('register throws when a step has a non-string id', () => {
    const registry = new FormaRegistry()
    const forma = makeSimpleForma({
      steps: [
        { id: 123 as unknown as string, title: 'Bad Step', kind: 'free-text' },
      ],
    })
    expect(() => registry.register('sys', forma)).toThrow('string id')
  })

  it('register throws when step id is missing entirely', () => {
    const registry = new FormaRegistry()
    const badForma = {
      systemId: 'test',
      steps: [{ title: 'No ID', kind: 'free-text' }],
      advancement: { paradigm: 'xp', starting: 100, tracks: [] },
    }
    expect(() => registry.register('sys', badForma)).toThrow()
  })
})
