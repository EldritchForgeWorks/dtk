import { describe, it, expect } from 'vitest'
import { checkForUpdates } from '../../../../src/domain/services/UpdateCheckService'
import { InMemoryRegistryStore } from '../../../../src/adapters/in-memory/InMemoryRegistryStore'
import { StubRegistryFetcher } from '../../../../src/adapters/in-memory/StubRegistryFetcher'
import { makeRegistryDocument, makeRegistryEntry } from '../../helpers/fixtures'

// ---------- Scenario: Outdated module detected ----------

describe('checkForUpdates — outdated detection', () => {
  it('detects dtk-systema v0.2.0 installed when registry lists v0.3.1', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: '0.3.1' })],
    })
    const installed = new Map([['dtk-systema', '0.2.0']])
    const outdated = checkForUpdates(registry, installed)
    expect(outdated).toContain('dtk-systema')
  })

  it('detects outdated when major version is behind', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: '2.0.0' })],
    })
    const installed = new Map([['dtk-systema', '1.9.9']])
    expect(checkForUpdates(registry, installed)).toContain('dtk-systema')
  })

  it('detects outdated when minor version is behind', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: '1.2.0' })],
    })
    const installed = new Map([['dtk-systema', '1.1.9']])
    expect(checkForUpdates(registry, installed)).toContain('dtk-systema')
  })

  it('detects outdated when only patch is behind', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: '0.3.1' })],
    })
    const installed = new Map([['dtk-systema', '0.3.0']])
    expect(checkForUpdates(registry, installed)).toContain('dtk-systema')
  })
})

// ---------- Scenario: Up-to-date module not flagged ----------

describe('checkForUpdates — up-to-date modules', () => {
  it('does not flag dtk-alea v1.0.0 when registry also lists v1.0.0', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-alea', latestVersion: '1.0.0', manifestUrl: 'https://example.com/dtk-alea/module.json' })],
    })
    const installed = new Map([['dtk-alea', '1.0.0']])
    expect(checkForUpdates(registry, installed)).not.toContain('dtk-alea')
  })

  it('does not flag when installed version is ahead of registry (downgrade guard)', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: '1.0.0' })],
    })
    const installed = new Map([['dtk-systema', '1.1.0']])
    expect(checkForUpdates(registry, installed)).not.toContain('dtk-systema')
  })

  it('returns empty array when all installed modules are current', () => {
    const registry = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-systema', latestVersion: '1.0.0' }),
        makeRegistryEntry({ id: 'dtk-alea', latestVersion: '2.0.0', manifestUrl: 'https://example.com/dtk-alea/module.json' }),
      ],
    })
    const installed = new Map([['dtk-systema', '1.0.0'], ['dtk-alea', '2.0.0']])
    expect(checkForUpdates(registry, installed)).toHaveLength(0)
  })
})

// ---------- Scenario: Module in registry but not installed is ignored ----------

describe('checkForUpdates — not installed modules', () => {
  it('ignores dtk-lex when it is not in the installed map', () => {
    const registry = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-lex', latestVersion: '1.0.0', manifestUrl: 'https://example.com/dtk-lex/module.json' }),
      ],
    })
    const installed = new Map<string, string>() // dtk-lex not installed
    expect(checkForUpdates(registry, installed)).not.toContain('dtk-lex')
    expect(checkForUpdates(registry, installed)).toHaveLength(0)
  })

  it('ignores modules in registry that are absent from installed map', () => {
    const registry = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-systema', latestVersion: '1.0.0' }),
        makeRegistryEntry({ id: 'dtk-alea', latestVersion: '2.0.0', manifestUrl: 'https://example.com/dtk-alea/module.json' }),
        makeRegistryEntry({ id: 'dtk-lex', latestVersion: '1.0.0', manifestUrl: 'https://example.com/dtk-lex/module.json' }),
      ],
    })
    // Only dtk-systema is installed
    const installed = new Map([['dtk-systema', '0.9.0']])
    const outdated = checkForUpdates(registry, installed)
    expect(outdated).toContain('dtk-systema')
    expect(outdated).not.toContain('dtk-alea')
    expect(outdated).not.toContain('dtk-lex')
  })

  it('modules in installed map but not in registry are not flagged', () => {
    const registry = makeRegistryDocument({ modules: [] })
    const installed = new Map([['dtk-systema', '1.0.0']])
    expect(checkForUpdates(registry, installed)).toHaveLength(0)
  })
})

// ---------- Scenario: Single notification for multiple outdated modules ----------

describe('checkForUpdates — multiple outdated modules', () => {
  it('returns both dtk-systema and dtk-alea when both are outdated', () => {
    const registry = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-systema', latestVersion: '0.3.1' }),
        makeRegistryEntry({ id: 'dtk-alea', latestVersion: '2.0.0', manifestUrl: 'https://example.com/dtk-alea/module.json' }),
      ],
    })
    const installed = new Map([['dtk-systema', '0.2.0'], ['dtk-alea', '1.9.0']])
    const outdated = checkForUpdates(registry, installed)
    expect(outdated).toContain('dtk-systema')
    expect(outdated).toContain('dtk-alea')
    expect(outdated).toHaveLength(2)
  })

  it('returns only outdated modules when mix of current and outdated', () => {
    const registry = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-systema', latestVersion: '1.0.0' }),
        makeRegistryEntry({ id: 'dtk-alea', latestVersion: '2.0.0', manifestUrl: 'https://example.com/dtk-alea/module.json' }),
      ],
    })
    const installed = new Map([['dtk-systema', '0.9.0'], ['dtk-alea', '2.0.0']])
    const outdated = checkForUpdates(registry, installed)
    expect(outdated).toContain('dtk-systema')
    expect(outdated).not.toContain('dtk-alea')
    expect(outdated).toHaveLength(1)
  })
})

// ---------- Scenario: No notification when all modules up to date ----------

describe('checkForUpdates — no updates available', () => {
  it('returns empty array when registry is empty', () => {
    const registry = makeRegistryDocument({ modules: [] })
    const installed = new Map([['dtk-systema', '1.0.0']])
    expect(checkForUpdates(registry, installed)).toHaveLength(0)
  })

  it('returns empty array when installed map is empty', () => {
    const registry = makeRegistryDocument()
    const installed = new Map<string, string>()
    expect(checkForUpdates(registry, installed)).toHaveLength(0)
  })
})

// ---------- Failure: malformed version strings ----------

describe('checkForUpdates — malformed versions', () => {
  it('skips module with malformed installed version without throwing', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: '1.0.0' })],
    })
    const installed = new Map([['dtk-systema', 'not-semver']])
    expect(() => checkForUpdates(registry, installed)).not.toThrow()
  })

  it('skips module with malformed registry latestVersion without throwing', () => {
    const registry = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: 'bad-version' })],
    })
    const installed = new Map([['dtk-systema', '1.0.0']])
    expect(() => checkForUpdates(registry, installed)).not.toThrow()
  })

  it('skips only the malformed entry when other entries are valid', () => {
    const registry = makeRegistryDocument({
      modules: [
        makeRegistryEntry({ id: 'dtk-systema', latestVersion: 'bad-version' }),
        makeRegistryEntry({ id: 'dtk-alea', latestVersion: '2.0.0', manifestUrl: 'https://example.com/dtk-alea/module.json' }),
      ],
    })
    const installed = new Map([['dtk-systema', '1.0.0'], ['dtk-alea', '1.0.0']])
    const outdated = checkForUpdates(registry, installed)
    expect(outdated).toContain('dtk-alea')
    expect(outdated).not.toContain('dtk-systema')
  })
})

// ---------- Scenario: Cached registry used on fetch failure ----------

describe('checkForUpdates — cache fallback integration scenario', () => {
  it('proceeds with cached data when fetcher throws', async () => {
    const store = new InMemoryRegistryStore()
    const cachedDoc = makeRegistryDocument({
      modules: [makeRegistryEntry({ id: 'dtk-systema', latestVersion: '0.5.0' })],
    })
    store.save(cachedDoc, '2026-01-01T00:00:00.000Z')

    const fetcher = new StubRegistryFetcher(new Error('Network failure'))

    // Simulate the ready hook: try fetch, fall back to cache
    let registry = cachedDoc
    try {
      registry = await fetcher.fetch('https://example.com/registry.json')
    } catch {
      const cached = store.load()
      if (cached) registry = cached.document
    }

    const installed = new Map([['dtk-systema', '0.2.0']])
    const outdated = checkForUpdates(registry, installed)
    expect(outdated).toContain('dtk-systema')
  })

  it('performs no update check when no cache and fetcher throws', async () => {
    const store = new InMemoryRegistryStore() // empty — no cache
    const fetcher = new StubRegistryFetcher(new Error('Network failure'))

    let registry = null
    try {
      const doc = await fetcher.fetch('https://example.com/registry.json')
      store.save(doc, '2026-01-01T00:00:00.000Z')
      registry = doc
    } catch {
      registry = store.load()?.document ?? null
    }

    expect(registry).toBeNull()
    // No update check can be run — consistent with spec "no user-facing message"
  })
})
