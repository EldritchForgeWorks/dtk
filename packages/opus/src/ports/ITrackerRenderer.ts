import type { Forma } from '../domain/Forma'
import type { CharacterBuild } from '../domain/CharacterBuild'

export interface ITrackerRenderer {
  open(actor: { id: string }, forma: Forma, build: CharacterBuild): void
}
