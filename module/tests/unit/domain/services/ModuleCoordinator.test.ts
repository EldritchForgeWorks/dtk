import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModuleCoordinator } from '../../../../src/domain/services/ModuleCoordinator'
import { DtkModuleEntry } from '../../../../src/domain/entities/DtkModuleEntry'
import { makeDtkModuleEntry } from '../../helpers/fixtures'

// ---------- Boundary ----------

describe('ModuleCoordinator — boundary conditions', () => {
  it('allReady returns true when no modules registered (vacuously true)', () => {
    const coord = new ModuleCoordinator()
    expect(coord.allReady()).toBe(true)
  })

  it('getRegistered returns empty map when nothing registered', () => {
    const coord = new ModuleCoordinator()
    expect(coord.getRegistered().size).toBe(0)
  })

  it('pendingModules returns empty array when nothing registered', () => {
    const coord = new ModuleCoordinator()
    expect(coord.pendingModules()).toHaveLength(0)
  })

  it('getApi returns undefined for unregistered module', () => {
    const coord = new ModuleCoordinator()
    expect(coord.getApi('dtk-lex')).toBeUndefined()
  })

  it('isInstalled returns false for unregistered module', () => {
    const coord = new ModuleCoordinator()
    expect(coord.isInstalled('dtk-lex')).toBe(false)
  })

  it('markReady on unknown id is a no-op (does not throw)', () => {
    const coord = new ModuleCoordinator()
    expect(() => coord.markReady('unknown-module')).not.toThrow()
  })
})

// ---------- Scenario ----------

describe('ModuleCoordinator — registration', () => {
  let coord: ModuleCoordinator

  beforeEach(() => {
    coord = new ModuleCoordinator()
  })

  it('registers a module entry with ready:false', () => {
    const entry = makeDtkModuleEntry({ id: 'dtk-systema' })
    coord.register(entry)
    const registered = coord.getRegistered().get('dtk-systema')
    expect(registered).toBe(entry)
    expect(registered?.ready).toBe(false)
  })

  it('isInstalled returns true after registration', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    expect(coord.isInstalled('dtk-systema')).toBe(true)
  })

  it('getApi returns the api object registered by the module', () => {
    const api = { roll: () => 0 }
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea', api }))
    expect(coord.getApi<typeof api>('dtk-alea')).toBe(api)
  })

  it('getApi returns undefined for a different unregistered module', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea', api: {} }))
    expect(coord.getApi('dtk-systema')).toBeUndefined()
  })
})

describe('ModuleCoordinator — readiness', () => {
  let coord: ModuleCoordinator

  beforeEach(() => {
    coord = new ModuleCoordinator()
  })

  it('allReady returns false when a registered module has not signalled ready', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    expect(coord.allReady()).toBe(false)
  })

  it('allReady returns true after the sole registered module marks ready', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    coord.markReady('dtk-systema')
    expect(coord.allReady()).toBe(true)
  })

  it('allReady returns false when only some modules are ready', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea' }))
    coord.markReady('dtk-systema')
    expect(coord.allReady()).toBe(false)
  })

  it('allReady returns true when all registered modules are ready', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea' }))
    coord.markReady('dtk-systema')
    coord.markReady('dtk-alea')
    expect(coord.allReady()).toBe(true)
  })

  it('markReady is idempotent — calling twice does not throw', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    coord.markReady('dtk-systema')
    expect(() => coord.markReady('dtk-systema')).not.toThrow()
    expect(coord.allReady()).toBe(true)
  })

  it('pendingModules lists only modules that have not yet signalled ready', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea' }))
    coord.markReady('dtk-alea')
    expect(coord.pendingModules()).toEqual(['dtk-systema'])
  })

  it('pendingModules returns empty array once all modules are ready', () => {
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    coord.markReady('dtk-systema')
    expect(coord.pendingModules()).toHaveLength(0)
  })
})

// ---------- Failure ----------

describe('ModuleCoordinator — duplicate registration', () => {
  it('emits console.warn on duplicate id', () => {
    const coord = new ModuleCoordinator()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea' }))
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea' }))
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('dtk-alea')
    warnSpy.mockRestore()
  })

  it('second registration replaces the first entry', () => {
    const coord = new ModuleCoordinator()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = makeDtkModuleEntry({ id: 'dtk-alea', api: { v: 1 } })
    const second = makeDtkModuleEntry({ id: 'dtk-alea', api: { v: 2 } })
    coord.register(first)
    coord.register(second)
    expect(coord.getRegistered().get('dtk-alea')).toBe(second)
    vi.restoreAllMocks()
  })
})

// ---------- Combinatorial ----------

describe('ModuleCoordinator — interleaved operations', () => {
  it('register, markReady, and getApi work correctly across multiple modules', () => {
    const coord = new ModuleCoordinator()
    const apiA = { name: 'alea' }
    const apiB = { name: 'systema' }

    coord.register(new DtkModuleEntry('dtk-alea', '1.0.0', apiA))
    coord.register(new DtkModuleEntry('dtk-systema', '0.3.0', apiB))

    expect(coord.allReady()).toBe(false)
    expect(coord.pendingModules()).toContain('dtk-alea')
    expect(coord.pendingModules()).toContain('dtk-systema')

    coord.markReady('dtk-alea')
    expect(coord.allReady()).toBe(false)
    expect(coord.pendingModules()).toEqual(['dtk-systema'])

    coord.markReady('dtk-systema')
    expect(coord.allReady()).toBe(true)
    expect(coord.pendingModules()).toHaveLength(0)

    expect(coord.getApi<typeof apiA>('dtk-alea')).toBe(apiA)
    expect(coord.getApi<typeof apiB>('dtk-systema')).toBe(apiB)
  })

  it('api stored as null is returned correctly', () => {
    const coord = new ModuleCoordinator()
    coord.register(new DtkModuleEntry('dtk-lex', '1.0.0', null))
    expect(coord.getApi('dtk-lex')).toBeNull()
  })

  it('getRegistered reflects all registrations in insertion order', () => {
    const coord = new ModuleCoordinator()
    coord.register(makeDtkModuleEntry({ id: 'dtk-alea' }))
    coord.register(makeDtkModuleEntry({ id: 'dtk-systema' }))
    coord.register(makeDtkModuleEntry({ id: 'dtk-lex' }))
    const keys = [...coord.getRegistered().keys()]
    expect(keys).toEqual(['dtk-alea', 'dtk-systema', 'dtk-lex'])
  })
})
