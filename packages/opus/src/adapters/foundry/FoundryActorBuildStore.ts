// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { IActorBuildStore } from '../../ports/IActorBuildStore'
import type { CharacterBuild } from '../../domain/CharacterBuild'

export class FoundryActorBuildStore implements IActorBuildStore {
  get(actorId: string): CharacterBuild | null {
    const actor = game.actors?.get(actorId)
    if (!actor) return null
    const build = actor.flags?.['dtk-opus']?.build
    if (!build || typeof build !== 'object') return null
    if (!('systemId' in build) || !('steps' in build) || !('advancements' in build)) return null
    return build as CharacterBuild
  }

  async set(actorId: string, build: CharacterBuild): Promise<void> {
    const actor = game.actors?.get(actorId)
    if (!actor) throw new Error(`dtk-opus: actor "${actorId}" not found`)
    await actor.update({ 'flags.dtk-opus.build': build })
  }
}
