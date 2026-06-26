import type { IActorRepository } from '../../ports/IActorRepository.js'
import type { ActorSnapshot } from '../../domain/value-objects/ActorSnapshot.js'

function actorToSnapshot(actor: FoundryActorDocument, tokenId?: string): ActorSnapshot {
  const dtkFlags = actor.flags?.['dtk-systema'] ?? {}
  const actionIds: string[] = Array.isArray(
    (dtkFlags as Record<string, unknown>)['actions'],
  )
    ? ((dtkFlags as Record<string, unknown>)['actions'] as string[])
    : []

  return {
    actorId: actor.id ?? '',
    tokenId: tokenId ?? null,
    name: actor.name,
    system: actor.system,
    flags: actor.flags,
    actionIds,
  }
}

export class FoundryActorRepository implements IActorRepository {
  getSnapshot(actorId: string): ActorSnapshot | undefined {
    const actor = game.actors?.get(actorId)
    if (!actor) return undefined
    return actorToSnapshot(actor)
  }

  getTokenSnapshot(tokenId: string): ActorSnapshot | undefined {
    const token = canvas.tokens?.get(tokenId)
    if (!token?.actor) return undefined
    return actorToSnapshot(token.actor, tokenId)
  }

  getTokenIdsInTemplate(templateId: string): readonly string[] {
    const template = canvas.templates?.get(templateId)
    if (!template) return []
    return (
      canvas.tokens?.placeables
        .filter((t) => template.object?.shape?.contains(t.x, t.y))
        .map((t) => t.id ?? '')
        .filter((id) => id.length > 0) ?? []
    )
  }

  isOwnedByCurrentUser(actorId: string): boolean {
    return game.actors?.get(actorId)?.isOwner ?? false
  }
}
