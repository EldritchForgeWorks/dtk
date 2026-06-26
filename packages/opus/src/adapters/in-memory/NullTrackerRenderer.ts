import type { ITrackerRenderer } from '../../ports/ITrackerRenderer'
import type { Forma } from '../../domain/Forma'
import type { CharacterBuild } from '../../domain/CharacterBuild'

export class NullTrackerRenderer implements ITrackerRenderer {
  open(_actor: { id: string }, _forma: Forma, _build: CharacterBuild): void {
    // no-op
  }
}
