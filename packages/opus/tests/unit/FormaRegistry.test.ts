import { describe, it, expect } from 'vitest'
import { FormaRegistry } from '../../src/domain/FormaRegistry'
import { makeSimpleForma, makeFormaWithAdvancement } from '../fixtures/forma'

describe('FormaRegistry', () => {
  describe('Boundary', () => {
    it('valid Forma stored by system id', () => {
      const registry = new FormaRegistry()
      const forma = makeSimpleForma()
      registry.register('sr5e', forma)
      expect(registry.get('sr5e')).toEqual(forma)
    })

    it('duplicate registration warns + overwrites', () => {
      const registry = new FormaRegistry()
      const formaA = makeSimpleForma({ systemId: 'sr5e' })
      const formaB = makeFormaWithAdvancement('xp', { systemId: 'sr5e' })
      const warnings: string[] = []
      const origWarn = console.warn
      console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
      try {
        registry.register('sr5e', formaA)
        registry.register('sr5e', formaB)
        expect(warnings.length).toBeGreaterThan(0)
        expect(registry.get('sr5e')).toEqual(formaB)
      } finally {
        console.warn = origWarn
      }
    })

    it('invalid Forma throws', () => {
      const registry = new FormaRegistry()
      expect(() => registry.register('sr5e', { steps: null })).toThrow()
    })

    it('steps with unique ids pass', () => {
      const registry = new FormaRegistry()
      const forma = makeSimpleForma()
      expect(() => registry.register('sr5e', forma)).not.toThrow()
    })

    it('duplicate step ids fail validation', () => {
      const registry = new FormaRegistry()
      const forma = makeSimpleForma({
        steps: [
          { id: 'metatype', title: 'Metatype', kind: 'choices', from: 'species', max: 1 },
          { id: 'metatype', title: 'Duplicate', kind: 'free-text' },
        ],
      })
      expect(() => registry.register('sr5e', forma)).toThrow()
    })

    it('valid step id reference in advancement track passes', () => {
      const registry = new FormaRegistry()
      const forma = makeSimpleForma({
        advancement: {
          paradigm: 'xp',
          currency: 'XP',
          starting: 100,
          tracks: [{ id: 'adv1', title: 'Adv', cost: 10, unlock_after: 'species' }],
        },
      })
      expect(() => registry.register('sr5e', forma)).not.toThrow()
    })

    it('unknown step id reference fails', () => {
      const registry = new FormaRegistry()
      const forma = makeSimpleForma({
        advancement: {
          paradigm: 'xp',
          currency: 'XP',
          starting: 100,
          tracks: [{ id: 'adv1', title: 'Adv', cost: 10, unlock_after: 'ghost-step' }],
        },
      })
      expect(() => registry.register('sr5e', forma)).toThrow()
    })

    it('registered Forma returned by id', () => {
      const registry = new FormaRegistry()
      const forma = makeSimpleForma()
      registry.register('sr5e', forma)
      expect(registry.get('sr5e')).not.toBeNull()
    })

    it('unregistered system returns null', () => {
      const registry = new FormaRegistry()
      expect(registry.get('unknown-system')).toBeNull()
    })

  })

  describe('Scenario', () => {
    it('registers multiple formas for different systems independently', () => {
      const registry = new FormaRegistry()
      const forma1 = makeSimpleForma({ systemId: 'system-a' })
      const forma2 = makeFormaWithAdvancement('milestone', { systemId: 'system-b' })
      registry.register('system-a', forma1)
      registry.register('system-b', forma2)
      expect(registry.get('system-a')).toEqual(forma1)
      expect(registry.get('system-b')).toEqual(forma2)
    })

    it('overwriting a registration preserves the latest Forma', () => {
      const registry = new FormaRegistry()
      const origWarn = console.warn
      console.warn = () => {}
      try {
        registry.register('sr5e', makeSimpleForma())
        const updated = makeFormaWithAdvancement('xp', { systemId: 'sr5e' })
        registry.register('sr5e', updated)
        expect(registry.get('sr5e')).toEqual(updated)
      } finally {
        console.warn = origWarn
      }
    })
  })

  describe('Failure', () => {
    it('throws for Forma missing steps entirely', () => {
      const registry = new FormaRegistry()
      expect(() => registry.register('x', {})).toThrow()
    })

    it('throws for Forma with non-object advancement', () => {
      const registry = new FormaRegistry()
      expect(() => registry.register('x', { steps: [], advancement: null })).toThrow()
    })
  })

  describe('Combinatorial', () => {
    it('register, overwrite, then get returns latest version', () => {
      const registry = new FormaRegistry()
      const origWarn = console.warn
      console.warn = () => {}
      try {
        const v1 = makeSimpleForma()
        const v2 = makeFormaWithAdvancement('marks')
        registry.register('sys', v1)
        registry.register('sys', v2)
        expect(registry.get('sys')).toEqual(v2)
        expect(registry.get('sys')).not.toEqual(v1)
      } finally {
        console.warn = origWarn
      }
    })

    it('two systems do not interfere with each other after registration', () => {
      const registry = new FormaRegistry()
      const a = makeSimpleForma({ systemId: 'a' })
      const b = makeSimpleForma({ systemId: 'b' })
      registry.register('a', a)
      registry.register('b', b)
      expect(registry.get('a')).toEqual(a)
      expect(registry.get('b')).toEqual(b)
      expect(registry.get('c')).toBeNull()
    })
  })
})