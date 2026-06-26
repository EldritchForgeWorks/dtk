import type { RegistryDocument } from '../domain/value-objects/RegistryDocument'

export interface IRegistryFetcher {
  fetch(url: string): Promise<RegistryDocument>
}
