import { describe, it, expect, vi } from 'vitest'
import { LexApi } from '../../src/domain/LexApi.js'
import { CodexRegistry } from '../../src/domain/CodexRegistry.js'
import { ExpressionEngine } from '../../src/domain/ExpressionEngine.js'
import { ConditionEvaluator } from '../../src/domain/ConditionEvaluator.js'
import { NullEditorRenderer } from '../../src/adapters/in-memory/NullEditorRenderer.js'
import { InMemoryCodexStore } from '../../src/adapters/in-memory/InMemoryCodexStore.js'
import { makeCodexEntry, makeConditionEntry } from '../fixtures/codex.js'
import { makeExpressionContext } from '../fixtures/context.js'

function makeDeps(editorFixture: string | null = null) {
  const registry = new CodexRegistry()
  const engine = new ExpressionEngine()
  const evaluator = new ConditionEvaluator(registry, engine)
  const editor = new NullEditorRenderer(editorFixture)
  const api = new LexApi({ registry, engine, evaluator, editor })
  return { api, registry, engine, evaluator, editor }
}

describe('LexApi', () => {
  describe('Lifecycle', () => {
    it('isReady is false before markReady', () => {
      const { api } = makeDeps()
      expect(api.isReady).toBe(false)
    })

    it('markReady sets isReady to true', () => {
      const { api } = makeDeps()
      api.markReady()
      expect(api.isReady).toBe(true)
    })

    it('evaluate() before markReady returns null with warning', () => {
      const { api } = makeDeps()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = api.evaluate('1 + 1', makeExpressionContext())
      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ready'))
      warnSpy.mockRestore()
    })
  })

  describe('evaluate', () => {
    it('delegates to ExpressionEngine after markReady', () => {
      const { api } = makeDeps()
      api.markReady()
      expect(api.evaluate('2 + 3', makeExpressionContext())).toBe(5)
    })

    it('returns null for a parse error expression', () => {
      const { api } = makeDeps()
      api.markReady()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = api.evaluate('???', makeExpressionContext())
      expect(result).toBeNull()
      warnSpy.mockRestore()
    })
  })

  describe('registerCodex / exportCodexJson', () => {
    it('registerCodex stores entries resolvable via exportCodexJson', () => {
      const { api } = makeDeps()
      api.registerCodex('sr5e', [makeCodexEntry()])
      expect(api.exportCodexJson('sr5e')).toEqual({ agility: 'Agility' })
    })

    it('exportCodexJson returns empty object for unregistered system', () => {
      const { api } = makeDeps()
      expect(api.exportCodexJson('unknown')).toEqual({})
    })

    it('re-registering a system warns and replaces entries', () => {
      const { api } = makeDeps()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      api.registerCodex('sr5e', [makeCodexEntry({ slug: 'old', displayName: 'Old' })])
      api.registerCodex('sr5e', [makeCodexEntry({ slug: 'new', displayName: 'New' })])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sr5e'))
      expect(api.exportCodexJson('sr5e')).toEqual({ new: 'New' })
      warnSpy.mockRestore()
    })
  })

  describe('resolveCondition', () => {
    it('returns true when condition expression evaluates truthy', () => {
      const { api } = makeDeps()
      api.registerCodex('sr5e', [makeConditionEntry('always', '1 == 1')])
      expect(api.resolveCondition('sr5e', 'always', makeExpressionContext())).toBe(true)
    })

    it('returns false when condition expression evaluates falsy', () => {
      const { api } = makeDeps()
      api.registerCodex('sr5e', [makeConditionEntry('never', '1 == 2')])
      expect(api.resolveCondition('sr5e', 'never', makeExpressionContext())).toBe(false)
    })

    it('returns false for unknown condition with warning', () => {
      const { api } = makeDeps()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(api.resolveCondition('sr5e', 'ghost', makeExpressionContext())).toBe(false)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('openEditor', () => {
    it('returns fixture string from NullEditorRenderer', async () => {
      const { api } = makeDeps('my-expression')
      const result = await api.openEditor({ systemId: 'sr5e', title: 'Test' })
      expect(result).toBe('my-expression')
    })

    it('returns null from NullEditorRenderer when constructed with null', async () => {
      const { api } = makeDeps(null)
      const result = await api.openEditor({ systemId: 'sr5e' })
      expect(result).toBeNull()
    })
  })

  describe('registerFunction', () => {
    it('delegates custom function to ExpressionEngine', () => {
      const { api } = makeDeps()
      api.markReady()
      api.registerFunction('triple', (args) => (args[0] as number) * 3)
      expect(api.evaluate('triple(4)', makeExpressionContext())).toBe(12)
    })
  })
})

describe('InMemoryCodexStore', () => {
  it('seed then load returns seeded entries', async () => {
    const store = new InMemoryCodexStore()
    const entry = makeCodexEntry()
    store.seed('sr5e', [entry])
    const loaded = await store.load('sr5e')
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.slug).toBe('agility')
  })

  it('save then load returns saved entries', async () => {
    const store = new InMemoryCodexStore()
    await store.save('sr5e', [makeCodexEntry({ slug: 'body', displayName: 'Body' })])
    const loaded = await store.load('sr5e')
    expect(loaded[0]?.slug).toBe('body')
  })

  it('load returns empty array for unknown system', async () => {
    const store = new InMemoryCodexStore()
    expect(await store.load('unknown')).toEqual([])
  })

  it('loadAll returns all seeded systems', async () => {
    const store = new InMemoryCodexStore()
    store.seed('sr5e', [makeCodexEntry()])
    store.seed('dcc', [makeCodexEntry({ slug: 'luck', displayName: 'Luck' })])
    const all = await store.loadAll()
    expect(Object.keys(all).sort()).toEqual(['dcc', 'sr5e'])
  })
})

describe('NullEditorRenderer', () => {
  it('open resolves to the fixture value', async () => {
    const renderer = new NullEditorRenderer('hello')
    expect(await renderer.open({ systemId: 'sr5e' })).toBe('hello')
  })

  it('open resolves to null when no fixture', async () => {
    const renderer = new NullEditorRenderer()
    expect(await renderer.open({ systemId: 'sr5e' })).toBeNull()
  })
})
