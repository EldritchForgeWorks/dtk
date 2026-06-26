import type { IActorRepository } from '../../ports/IActorRepository.js'
import type { ActorSnapshot } from '../../domain/value-objects/ActorSnapshot.js'

export class InMemoryActorRepository implements IActorRepository {
  private readonly actors = new Map<string, ActorSnapshot>()
  private readonly tokenToActor = new Map<string, string>()
  private readonly templateTokenMap = new Map<string, string[]>()
  private readonly ownedActors = new Set<string>()

  seed(snapshot: ActorSnapshot): this {
    this.actors.set(snapshot.actorId, snapshot)
    return this
  }

  seedTokenMapping(tokenId: string, actorId: string): this {
    this.tokenToActor.set(tokenId, actorId)
    return this
  }

  seedTemplateTokens(templateId: string, tokenIds: string[]): this {
    this.templateTokenMap.set(templateId, tokenIds)
    return this
  }

  seedOwned(actorId: string): this {
    this.ownedActors.add(actorId)
    return this
  }

  getSnapshot(actorId: string): ActorSnapshot | undefined {
    return this.actors.get(actorId)
  }

  getTokenSnapshot(tokenId: string): ActorSnapshot | undefined {
    const actorId = this.tokenToActor.get(tokenId)
    if (!actorId) return undefined
    return this.actors.get(actorId)
  }

  getTokenIdsInTemplate(templateId: string): readonly string[] {
    return this.templateTokenMap.get(templateId) ?? []
  }

  isOwnedByCurrentUser(actorId: string): boolean {
    return this.ownedActors.has(actorId)
  }
}
