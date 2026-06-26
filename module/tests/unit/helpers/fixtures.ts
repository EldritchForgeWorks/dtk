import type { RegistryEntry } from '../../../src/domain/value-objects/RegistryEntry'
import type { RegistryDocument } from '../../../src/domain/value-objects/RegistryDocument'
import type { RegistryCache } from '../../../src/domain/value-objects/RegistryCache'
import { DtkModuleEntry } from '../../../src/domain/entities/DtkModuleEntry'

export function makeRegistryEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    id: 'dtk-systema',
    name: 'DTK Systema',
    tier: 'free',
    latestVersion: '1.0.0',
    manifestUrl: 'https://example.com/dtk-systema/module.json',
    description: 'The Systema module for DTK.',
    dependencies: ['dtk'],
    ...overrides,
  }
}

export function makeRegistryDocument(overrides: { modules?: RegistryEntry[] } = {}): RegistryDocument {
  return {
    version: 1,
    modules: overrides.modules ?? [makeRegistryEntry()],
  }
}

export function makeRegistryCache(overrides: Partial<RegistryCache> = {}): RegistryCache {
  return {
    document: makeRegistryDocument(),
    fetchedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeDtkModuleEntry(overrides: { id?: string; version?: string; api?: unknown } = {}): DtkModuleEntry {
  return new DtkModuleEntry(
    overrides.id ?? 'dtk-systema',
    overrides.version ?? '1.0.0',
    overrides.api ?? {},
  )
}
