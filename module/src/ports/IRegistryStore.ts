import type { RegistryCache } from '../domain/value-objects/RegistryCache'
import type { RegistryDocument } from '../domain/value-objects/RegistryDocument'

export interface IRegistryStore {
  load(): RegistryCache | null
  save(document: RegistryDocument, fetchedAt: string): void
}
