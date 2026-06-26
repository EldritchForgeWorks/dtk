import { describe, it, expect } from 'vitest'
import { InMemoryActorBuildStore } from '../../src/adapters/in-memory/InMemoryActorBuildStore'
import { NullLexDelegate } from '../../src/adapters/in-memory/NullLexDelegate'
import { NullTrackerRenderer } from '../../src/adapters/in-memory/NullTrackerRenderer'
import { NullWizardRenderer } from '../../src/adapters/in-memory/NullWizardRenderer'
import { StubExemplarQuery } from '../../src/adapters/in-memory/StubExemplarQuery'
import type { Exemplar } from '../../src/ports/IExemplarQuery'
import { makeCharacterBuild } from '../fixtures/build'
import { makeSimpleForma } from '../fixtures/forma'

describe('InMemoryActorBuildStore', () => {
  it('get returns null for unknown actorId', () => {
    const store = new InMemoryActorBuildStore()
    expect(store.get('unknown')).toBeNull()
  })

  it('set then get returns the stored build', async () => {
    const store = new InMemoryActorBuildStore()
    const build = makeCharacterBuild()
    await store.set('actor-1', build)
    expect(store.get('actor-1')).toEqual(build)
  })

  it('set resolves to undefined (Promise<void>)', async () => {
    const store = new InMemoryActorBuildStore()
    const result = await store.set('actor-x', makeCharacterBuild())
    expect(result).toBeUndefined()
  })

  it('set overwrites an existing entry for the same actorId', async () => {
    const store = new InMemoryActorBuildStore()
    const buildA = makeCharacterBuild({ systemId: 'system-a' })
    const buildB = makeCharacterBuild({ systemId: 'system-b' })
    await store.set('actor-1', buildA)
    await store.set('actor-1', buildB)
    expect(store.get('actor-1')?.systemId).toBe('system-b')
  })

  it('different actorIds are stored independently', async () => {
    const store = new InMemoryActorBuildStore()
    const buildA = makeCharacterBuild({ systemId: 'sys-a' })
    const buildB = makeCharacterBuild({ systemId: 'sys-b' })
    await store.set('actor-a', buildA)
    await store.set('actor-b', buildB)
    expect(store.get('actor-a')?.systemId).toBe('sys-a')
    expect(store.get('actor-b')?.systemId).toBe('sys-b')
  })
})

describe('NullLexDelegate', () => {
  it('evaluate always returns null', () => {
    const delegate = new NullLexDelegate()
    expect(delegate.evaluate('any expression', {})).toBeNull()
  })

  it('evaluate returns null regardless of context', () => {
    const delegate = new NullLexDelegate()
    expect(delegate.evaluate('@steps.foo.choice == "bar"', { foo: 'bar' })).toBeNull()
  })
})

describe('NullTrackerRenderer', () => {
  it('open is a no-op and returns undefined', () => {
    const renderer = new NullTrackerRenderer()
    const actor = { id: 'actor-1' }
    const forma = makeSimpleForma()
    const build = makeCharacterBuild()
    const result = renderer.open(actor, forma, build)
    expect(result).toBeUndefined()
  })
})

describe('NullWizardRenderer', () => {
  it('open resolves with null by default', async () => {
    const renderer = new NullWizardRenderer()
    const result = await renderer.open({ id: 'actor-1' }, makeSimpleForma(), {} as never)
    expect(result).toBeNull()
  })

  it('open resolves with the build provided at construction', async () => {
    const build = makeCharacterBuild()
    const renderer = new NullWizardRenderer(build)
    const result = await renderer.open({ id: 'actor-1' }, makeSimpleForma(), {} as never)
    expect(result).toEqual(build)
  })
})

describe('StubExemplarQuery', () => {
  it('query returns empty array when no seed data', async () => {
    const stub = new StubExemplarQuery()
    const result = await stub.query('species')
    expect(result).toEqual([])
  })

  it('query returns seeded data for matching kind', async () => {
    const exemplars: Exemplar[] = [
      { id: 'elf', name: 'Elf', kind: 'species', data: {} },
      { id: 'human', name: 'Human', kind: 'species', data: {} },
    ]
    const stub = new StubExemplarQuery(new Map([['species', exemplars]]))
    const result = await stub.query('species')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('elf')
  })

  it('query returns empty array for unknown kind', async () => {
    const exemplars: Exemplar[] = [{ id: 'elf', name: 'Elf', kind: 'species', data: {} }]
    const stub = new StubExemplarQuery(new Map([['species', exemplars]]))
    const result = await stub.query('archetype')
    expect(result).toEqual([])
  })
})
