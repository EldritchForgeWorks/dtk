import type { ICombatStateStore } from '../../ports/ICombatStateStore.js'
import type { PendingDecisionPayload } from '../../domain/entities/PendingDecision.js'
import type { MaybeCombatSnapshot } from '../../domain/value-objects/CombatSnapshot.js'

export class FoundryCombatStateStore implements ICombatStateStore {
  private get combat(): FoundryCombatDocument | null | undefined {
    return game.combat
  }

  async writePending(sequenceId: string, payload: PendingDecisionPayload): Promise<void> {
    await this.combat?.setFlag('dtk-alea', sequenceId, payload)
  }

  readPending(sequenceId: string): PendingDecisionPayload | undefined {
    return this.combat?.getFlag('dtk-alea', sequenceId) as PendingDecisionPayload | undefined
  }

  async clearPending(sequenceId: string): Promise<void> {
    await this.combat?.unsetFlag('dtk-alea', sequenceId)
  }

  readAllPending(): readonly PendingDecisionPayload[] {
    const flags = this.combat?.flags?.['dtk-alea'] ?? {}
    return Object.values(flags) as PendingDecisionPayload[]
  }

  getCurrentCombat(): MaybeCombatSnapshot {
    const c = this.combat
    if (!c?.started) return null
    return {
      round: c.round ?? 0,
      turn: c.turn ?? 0,
      combatantId: c.combatant?.id ?? '',
      combatId: c.id ?? '',
    }
  }
}
