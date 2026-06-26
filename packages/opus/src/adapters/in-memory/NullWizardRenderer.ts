import type { IWizardRenderer } from '../../ports/IWizardRenderer'
import type { Forma } from '../../domain/Forma'
import type { CharacterBuild } from '../../domain/CharacterBuild'
import type { CreationEngine } from '../../domain/CreationEngine'

export class NullWizardRenderer implements IWizardRenderer {
  constructor(private result: CharacterBuild | null = null) {}

  open(
    _actor: { id: string },
    _forma: Forma,
    _engine: CreationEngine
  ): Promise<CharacterBuild | null> {
    return Promise.resolve(this.result)
  }
}
