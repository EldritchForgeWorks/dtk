import type { IActorRepository } from '../../ports/IActorRepository.js'
import type { ICombatStateStore } from '../../ports/ICombatStateStore.js'
import type { RollContext } from '../value-objects/RollContext.js'
import type { ResolvedTarget } from '../value-objects/ResolvedTarget.js'
import { validateRollContext } from '../value-objects/RollContext.js'
import { ContextBuildError } from '../../errors.js'

export interface BuildOptions {
  initiatorActorId: string
  targets: readonly ResolvedTarget[]
  actionId: string
  itemId: string | null
  stepInputs?: Record<string, unknown>
}

export class ContextBuilder {
  constructor(
    private readonly repo: IActorRepository,
    private readonly combatStore: ICombatStateStore,
  ) {}

  build(opts: BuildOptions): RollContext {
    const initiator = this.repo.getSnapshot(opts.initiatorActorId)
    if (!initiator) {
      throw new ContextBuildError(
        `ContextBuilder: actor not found: "${opts.initiatorActorId}"`,
      )
    }

    const combat = this.combatStore.getCurrentCombat()

    const ctx: RollContext = {
      initiator,
      targets: opts.targets,
      actionId: opts.actionId,
      itemId: opts.itemId,
      combat,
      stepInputs: opts.stepInputs ?? {},
    }

    if (!validateRollContext(ctx)) {
      throw new ContextBuildError('ContextBuilder: assembled context failed validation')
    }

    return ctx
  }
}
