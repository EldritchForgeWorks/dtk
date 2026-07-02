// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { IWizardRenderer } from '../../ports/IWizardRenderer'
import type { Forma } from '../../domain/Forma'
import type { CharacterBuild } from '../../domain/CharacterBuild'
import type { CreationEngine } from '../../domain/CreationEngine'
import type { IActorBuildStore } from '../../ports/IActorBuildStore'
import { getCreationWizardAppClass } from './CreationWizardApp'

export class FoundryWizardRenderer implements IWizardRenderer {
  constructor(private store: IActorBuildStore) {}

  async open(
    actor: { id: string },
    forma: Forma,
    engine: CreationEngine
  ): Promise<CharacterBuild | null> {
    const AppClass = getCreationWizardAppClass()
    const app = new AppClass(forma, engine)
    const build = await app.open()
    if (build) {
      await this.store.set(actor.id, build)
    }
    return build
  }
}
