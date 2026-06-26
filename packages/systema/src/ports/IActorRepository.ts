import type { ActorSnapshot } from '../domain/value-objects/ActorSnapshot.js'

export interface IActorRepository {
  getSnapshot(actorId: string): ActorSnapshot | undefined
  getTokenSnapshot(tokenId: string): ActorSnapshot | undefined
  getTokenIdsInTemplate(templateId: string): readonly string[]
  isOwnedByCurrentUser(actorId: string): boolean
}
