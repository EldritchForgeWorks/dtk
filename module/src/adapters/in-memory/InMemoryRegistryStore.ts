import type { IRegistryStore } from '../../ports/IRegistryStore'
import type { RegistryDocument } from '../../domain/value-objects/RegistryDocument'
import type { RegistryCache } from '../../domain/value-objects/RegistryCache'
import { makeRegistryCache } from '../../domain/value-objects/RegistryCache'

export class InMemoryRegistryStore implements IRegistryStore {
  private cache: RegistryCache | null = null

  load(): RegistryCache | null {
    return this.cache
  }

  save(document: RegistryDocument, fetchedAt: string): void {
    this.cache = makeRegistryCache(document, fetchedAt)
  }
}
