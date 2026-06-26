import { describe, it, expect, vi } from 'vitest'
import { CodexRegistry } from '../../src/domain/CodexRegistry.js'
import { validateCodexEntry } from '../../src/domain/CodexEntry.js'
import { makeCodexEntry, makeSr5eCodex, makeConditionEntry } from '../fixtures/codex.js'

describe('CodexRegistry', () => {
  describe('Boundary', () => {
    it('valid entries stored by system id', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', [makeCodexEntry()])
      expect(registry.resolve('sr5e', 'agility')?.displayName).toBe('Agility')
    })

    it('re-registration warns + overwrites', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const registry = new CodexRegistry()
      registry.register('sr5e', [makeCodexEntry({ slug: 'old', displayName: 'Old' })])
      registry.register('sr5e', [makeCodexEntry({ slug: 'new-slug', displayName: 'New' })])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sr5e'))
      expect(registry.resolve('sr5e', 'old')).toBeNull()
      expect(registry.resolve('sr5e', 'new-slug')?.displayName).toBe('New')
      warnSpy.mockRestore()
    })

    it('invalid entry throws', () => {
      const registry = new CodexRegistry()
      expect(() => registry.register('sr5e', [{ slug: 'foo' } as any])).toThrow('displayName')
    })

    it('known slug resolves', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', makeSr5eCodex())
      const entry = registry.resolve('sr5e', 'body')
      expect(entry).not.toBeNull()
      expect(entry?.displayName).toBe('Body')
    })

    it('unknown slug returns null', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', makeSr5eCodex())
      expect(registry.resolve('sr5e', 'nonexistent')).toBeNull()
    })

    it('cross-system slug returns null', () => {
      const registry = new CodexRegistry()
      registry.register('dcc', [{ slug: 'luck', displayName: 'Luck' }])
      expect(registry.resolve('sr5e', 'luck')).toBeNull()
    })

    it('slugs listed alphabetically', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', [
        { slug: 'willpower', displayName: 'Willpower' },
        { slug: 'agility',   displayName: 'Agility' },
        { slug: 'body',      displayName: 'Body' },
      ])
      expect(registry.listSlugs('sr5e')).toEqual(['agility', 'body', 'willpower'])
    })

    it('unregistered system list returns empty array', () => {
      const registry = new CodexRegistry()
      expect(registry.listSlugs('unknown-system')).toEqual([])
    })

    it('export maps slug to displayName', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', [
        { slug: 'agility', displayName: 'Agility' },
        { slug: 'body',    displayName: 'Body' },
      ])
      expect(registry.exportJson('sr5e')).toEqual({ agility: 'Agility', body: 'Body' })
    })

    it('export for unregistered system returns empty object', () => {
      const registry = new CodexRegistry()
      expect(registry.exportJson('no-such-system')).toEqual({})
    })
  })

  describe('Scenario', () => {
    it('empty entries array registers without error', () => {
      const registry = new CodexRegistry()
      expect(() => registry.register('sr5e', [])).not.toThrow()
      expect(registry.listSlugs('sr5e')).toEqual([])
    })

    it('entry with all optional fields stored correctly', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', [{
        slug: 'prone',
        displayName: 'Prone',
        description: 'On the ground',
        condition: '@actor.prone == true',
      }])
      const entry = registry.resolve('sr5e', 'prone')
      expect(entry?.description).toBe('On the ground')
      expect(entry?.condition).toBe('@actor.prone == true')
    })

    it('listConditionSlugs returns only entries with a condition field', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', [
        { slug: 'agility', displayName: 'Agility' },
        makeConditionEntry('prone', '@actor.prone == true'),
        makeConditionEntry('flanked', '@combat.flanked == true'),
      ])
      expect(registry.listConditionSlugs('sr5e')).toEqual(['flanked', 'prone'])
    })

    it('listConditionSlugs returns empty array for unregistered system', () => {
      const registry = new CodexRegistry()
      expect(registry.listConditionSlugs('missing')).toEqual([])
    })

    it('full sr5e codex registers — all 8 slugs resolve', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', makeSr5eCodex())
      const slugs = registry.listSlugs('sr5e')
      expect(slugs).toHaveLength(8)
      expect(slugs[0]).toBe('agility')
    })

    it('resolve returns null for system never registered', () => {
      const registry = new CodexRegistry()
      expect(registry.resolve('never-seen', 'anything')).toBeNull()
    })
  })

  describe('Failure', () => {
    it('entry with empty slug throws with descriptive message', () => {
      const registry = new CodexRegistry()
      expect(() => registry.register('sr5e', [{ slug: '', displayName: 'X' }])).toThrow("'slug'")
    })

    it('entry with non-string slug throws', () => {
      const registry = new CodexRegistry()
      expect(() => registry.register('sr5e', [{ slug: 123 as any, displayName: 'X' }])).toThrow("'slug'")
    })

    it('validateCodexEntry throws for non-object input', () => {
      expect(() => validateCodexEntry('not-an-object', 0)).toThrow('expected an object')
    })

    it('validateCodexEntry throws for null', () => {
      expect(() => validateCodexEntry(null, 0)).toThrow('expected an object')
    })

    it('validateCodexEntry error includes the index', () => {
      expect(() => validateCodexEntry({ slug: '', displayName: 'X' }, 3)).toThrow('index 3')
    })

    it('entry with whitespace-only displayName throws', () => {
      const registry = new CodexRegistry()
      expect(() => registry.register('sr5e', [{ slug: 'foo', displayName: '   ' }])).toThrow('displayName')
    })
  })

  describe('Combinatorial', () => {
    it('two systems share same slug — each resolves independently', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', [{ slug: 'agility', displayName: 'SR5 Agility' }])
      registry.register('dcc', [{ slug: 'agility', displayName: 'DCC Agility' }])
      expect(registry.resolve('sr5e', 'agility')?.displayName).toBe('SR5 Agility')
      expect(registry.resolve('dcc', 'agility')?.displayName).toBe('DCC Agility')
    })

    it('batch with duplicate slugs — last value wins', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', [
        { slug: 'agility', displayName: 'First' },
        { slug: 'agility', displayName: 'Second' },
      ])
      expect(registry.resolve('sr5e', 'agility')?.displayName).toBe('Second')
    })

    it('re-registration replaces old entries — slugs from old batch no longer resolve', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const registry = new CodexRegistry()
      registry.register('sr5e', [{ slug: 'old-slug', displayName: 'Old' }])
      registry.register('sr5e', [{ slug: 'new-slug', displayName: 'New' }])
      expect(registry.resolve('sr5e', 'old-slug')).toBeNull()
      expect(registry.resolve('sr5e', 'new-slug')?.displayName).toBe('New')
      warnSpy.mockRestore()
    })

    it('registering two systems and listing each returns only own slugs', () => {
      const registry = new CodexRegistry()
      registry.register('sr5e', makeSr5eCodex())
      registry.register('dcc', [{ slug: 'luck', displayName: 'Luck' }])
      expect(registry.listSlugs('sr5e')).toHaveLength(8)
      expect(registry.listSlugs('dcc')).toHaveLength(1)
    })
  })
})
