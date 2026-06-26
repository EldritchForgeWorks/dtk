import type { RegistryDocument } from './RegistryDocument'

export type RegistryCache = {
  readonly document: RegistryDocument
  readonly fetchedAt: string
}

export function makeRegistryCache(
  document: RegistryDocument,
  fetchedAt: string,
): RegistryCache {
  return { document, fetchedAt }
}
