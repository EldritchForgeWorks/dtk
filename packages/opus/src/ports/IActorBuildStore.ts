import type { CharacterBuild } from '../domain/CharacterBuild'

export interface IActorBuildStore {
  get(actorId: string): CharacterBuild | null
  set(actorId: string, build: CharacterBuild): Promise<void>
}
