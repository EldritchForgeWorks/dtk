import { describe, it, expect } from 'vitest'
import { SystemRegistrar } from '../../../../src/domain/services/SystemRegistrar.js'
import { SystemaError } from '../../../../src/errors.js'

const VALID_MODUS = {
  id: 'test-system',
  schemaVersion: 1,
  actors: {
    character: { label: 'Character', dataModel: {} },
    npc: { label: 'NPC', dataModel: {} },
  },
}

describe('SystemRegistrar', () => {
  describe('validate', () => {
    it('returns true for a valid modus', () => {
      expect(SystemRegistrar.validate(VALID_MODUS)).toBe(true)
    })

    it('returns false for null', () => {
      expect(SystemRegistrar.validate(null)).toBe(false)
    })

    it('returns false for missing id', () => {
      expect(SystemRegistrar.validate({ schemaVersion: 1, actors: { a: { label: 'A', dataModel: {} } } })).toBe(false)
    })

    it('returns false for empty actors record', () => {
      expect(SystemRegistrar.validate({ id: 'x', schemaVersion: 1, actors: {} })).toBe(false)
    })

    it('returns false for missing schemaVersion', () => {
      expect(SystemRegistrar.validate({ id: 'x', actors: { a: { label: 'A', dataModel: {} } } })).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(SystemRegistrar.validate('not an object')).toBe(false)
    })
  })

  describe('build', () => {
    it('returns a RegistrationDescriptor for a valid modus', () => {
      const desc = SystemRegistrar.build(VALID_MODUS)
      expect(desc.systemId).toBe('test-system')
      expect(desc.actors).toHaveLength(2)
      expect(desc.items).toHaveLength(0)
      expect(desc.settings).toEqual([])
      expect(desc.hooks).toEqual([])
    })

    it('maps actor types to ActorDeclaration[]', () => {
      const desc = SystemRegistrar.build(VALID_MODUS)
      const types = desc.actors.map((a) => a.type)
      expect(types).toContain('character')
      expect(types).toContain('npc')
    })

    it('maps item types when modus.items is declared', () => {
      const modus = {
        ...VALID_MODUS,
        items: { weapon: { label: 'Weapon', dataModel: {} } },
      }
      const desc = SystemRegistrar.build(modus)
      expect(desc.items).toHaveLength(1)
      expect(desc.items[0]?.type).toBe('weapon')
    })

    it('returns empty items when modus.items is absent', () => {
      const desc = SystemRegistrar.build(VALID_MODUS)
      expect(desc.items).toHaveLength(0)
    })

    it('includes settings when declared', () => {
      const modus = {
        ...VALID_MODUS,
        settings: [
          { key: 'someKey', name: 'Some Key', type: 'number' as const, default: 0, scope: 'world' as const, config: true },
        ],
      }
      const desc = SystemRegistrar.build(modus)
      expect(desc.settings).toHaveLength(1)
    })

    it('throws SystemaError for invalid modus', () => {
      expect(() => SystemRegistrar.build({ id: 'sr5e' })).toThrow(SystemaError)
    })

    it('throws SystemaError for null modus', () => {
      expect(() => SystemRegistrar.build(null)).toThrow(SystemaError)
    })

    it('throws SystemaError error message describes the problem', () => {
      expect(() => SystemRegistrar.build({ id: 'x' })).toThrow(/Invalid Modus/)
    })

    it('preserves actor labels', () => {
      const desc = SystemRegistrar.build(VALID_MODUS)
      const char = desc.actors.find((a) => a.type === 'character')
      expect(char?.label).toBe('Character')
    })

    it('handles multiple actors and items simultaneously', () => {
      const modus = {
        id: 'my-system',
        schemaVersion: 1,
        actors: {
          pc: { label: 'PC', dataModel: {} },
          npc: { label: 'NPC', dataModel: {} },
          vehicle: { label: 'Vehicle', dataModel: {} },
        },
        items: {
          weapon: { label: 'Weapon', dataModel: {} },
          armor: { label: 'Armor', dataModel: {} },
        },
      }
      const desc = SystemRegistrar.build(modus)
      expect(desc.actors).toHaveLength(3)
      expect(desc.items).toHaveLength(2)
    })
  })
})
