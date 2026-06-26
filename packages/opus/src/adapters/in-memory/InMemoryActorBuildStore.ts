import type { IActorBuildStore } from '../../ports/IActorBuildStore'
import type { CharacterBuild } from '../../domain/CharacterBuild'

export class InMemoryActorBuildStore implements IActorBuildStore {
  private store = new Map<string, CharacterBuild>()

  get(actorId: string): CharacterBuild | null {
    return this.store.get(actorId) ?? null
  }

  set(actorId: string, build: CharacterBuild): Promise<void> {
    this.store.set(actorId, build)
    return Promise.resolve()
  }
}
