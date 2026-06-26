import type { IRegistryFetcher } from '../../ports/IRegistryFetcher'
import type { RegistryDocument } from '../../domain/value-objects/RegistryDocument'

export class StubRegistryFetcher implements IRegistryFetcher {
  constructor(private readonly behaviour: RegistryDocument | Error) {}

  async fetch(_url: string): Promise<RegistryDocument> {
    if (this.behaviour instanceof Error) throw this.behaviour
    return this.behaviour
  }
}
