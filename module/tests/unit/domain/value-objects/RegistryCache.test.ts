import { describe, it, expect } from 'vitest'
import { makeRegistryCache } from '../../../../src/domain/value-objects/RegistryCache'
import { InMemoryRegistryStore } from '../../../../src/adapters/in-memory/InMemoryRegistryStore'
import { makeRegistryDocument, makeRegistryEntry } from '../../helpers/fixtures'

describe('makeRegistryCache', () => {
  // ---------- Scenario ----------

  it('creates a cache object with the given document and fetchedAt', () => {
    const doc = makeRegistryDocument()
    const ts = '2026-01-15T12:00:00.000Z'
    const cache = makeRegistryCache(doc, ts)
    expect(cache.document).toBe(doc)
    expect(cache.fetchedAt).toBe(ts)
  })

  it('stores the document verbatim (not a deep clone)', () => {
    const doc = makeRegistryDocument()
    const cache = makeRegistryCache(doc, '2026-01-01T00:00:00.000Z')
    expect(cache.document).toBe(doc)
  })

  // ---------- Boundary ----------

  it('accepts an empty modules array in the document', () => {
    const doc = makeRegistryDocument({ modules: [] })
    const cache = makeRegistryCache(doc, '2026-01-01T00:00:00.000Z')
    expect(cache.document.modules).toHaveLength(0)
  })

  it('preserves fetchedAt as an ISO string exactly as provided', () => {
    const ts = '2026-06-22T08:30:00.000Z'
    const cache = makeRegistryCache(makeRegistryDocument(), ts)
    expect(cache.fetchedAt).toBe(ts)
  })

  // ---------- Combinatorial ----------

  it('creates distinct cache objects for different calls', () => {
    const doc1 = makeRegistryDocument({ modules: [makeRegistryEntry({ id: 'dtk-systema' })] })
    const doc2 = makeRegistryDocument({ modules: [makeRegistryEntry({ id: 'dtk-alea', manifestUrl: 'https://example.com/dtk-alea/module.json' })] })
    const cache1 = makeRegistryCache(doc1, '2026-01-01T00:00:00.000Z')
    const cache2 = makeRegistryCache(doc2, '2026-06-01T00:00:00.000Z')
    expect(cache1.document.modules[0].id).toBe('dtk-systema')
    expect(cache2.document.modules[0].id).toBe('dtk-alea')
    expect(cache1.fetchedAt).not.toBe(cache2.fetchedAt)
  })
})

describe('InMemoryRegistryStore', () => {
  // ---------- Scenario: Successful fetch updates cache ----------

  it('load returns null when nothing has been saved', () => {
    const store = new InMemoryRegistryStore()
    expect(store.load()).toBeNull()
  })

  it('load returns the saved cache after save is called', () => {
    const store = new InMemoryRegistryStore()
    const doc = makeRegistryDocument()
    const ts = '2026-01-01T00:00:00.000Z'
    store.save(doc, ts)
    const result = store.load()
    expect(result).not.toBeNull()
    expect(result!.document).toEqual(doc)
    expect(result!.fetchedAt).toBe(ts)
  })

  it('overwrites previous cache on subsequent save', () => {
    const store = new InMemoryRegistryStore()
    const doc1 = makeRegistryDocument({ modules: [makeRegistryEntry({ id: 'dtk-systema' })] })
    const doc2 = makeRegistryDocument({ modules: [makeRegistryEntry({ id: 'dtk-alea', manifestUrl: 'https://example.com/dtk-alea/module.json' })] })
    store.save(doc1, '2026-01-01T00:00:00.000Z')
    store.save(doc2, '2026-06-01T00:00:00.000Z')
    const result = store.load()
    expect(result!.document.modules[0].id).toBe('dtk-alea')
    expect(result!.fetchedAt).toBe('2026-06-01T00:00:00.000Z')
  })

  // ---------- Scenario: Failed fetch uses cached data ----------

  it('cache persists across multiple load calls', () => {
    const store = new InMemoryRegistryStore()
    const doc = makeRegistryDocument()
    store.save(doc, '2026-01-01T00:00:00.000Z')
    const first = store.load()
    const second = store.load()
    expect(first).toEqual(second)
  })

  // ---------- Scenario: No cache and failed fetch ----------

  it('fresh store returns null on load — reflects no cache available', () => {
    const store = new InMemoryRegistryStore()
    expect(store.load()).toBeNull()
  })

  // ---------- Boundary ----------

  it('saves and loads a document with empty modules array', () => {
    const store = new InMemoryRegistryStore()
    const doc = makeRegistryDocument({ modules: [] })
    store.save(doc, '2026-01-01T00:00:00.000Z')
    expect(store.load()!.document.modules).toHaveLength(0)
  })

  it('saves and loads a document with many modules', () => {
    const store = new InMemoryRegistryStore()
    const modules = Array.from({ length: 10 }, (_, i) =>
      makeRegistryEntry({ id: `dtk-module-${i}`, manifestUrl: `https://example.com/dtk-module-${i}/module.json` }),
    )
    const doc = makeRegistryDocument({ modules })
    store.save(doc, '2026-01-01T00:00:00.000Z')
    expect(store.load()!.document.modules).toHaveLength(10)
  })
})
