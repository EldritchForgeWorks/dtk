import type { Forma } from '../domain/Forma'
import type { CharacterBuild } from '../domain/CharacterBuild'
import type { CreationEngine } from '../domain/CreationEngine'

export interface IWizardRenderer {
  open(
    actor: { id: string },
    forma: Forma,
    engine: CreationEngine
  ): Promise<CharacterBuild | null>
}
