import type { ICombatStateStore } from '../../ports/ICombatStateStore.js'
import type { PendingDecisionPayload } from '../../domain/entities/PendingDecision.js'
import type { MaybeCombatSnapshot } from '../../domain/value-objects/CombatSnapshot.js'

export class InMemoryCombatStateStore implements ICombatStateStore {
  private readonly pending = new Map<string, PendingDecisionPayload>()
  private combat: MaybeCombatSnapshot = null

  seedCombat(snapshot: MaybeCombatSnapshot): this {
    this.combat = snapshot
    return this
  }

  async writePending(sequenceId: string, payload: PendingDecisionPayload): Promise<void> {
    this.pending.set(sequenceId, payload)
  }

  readPending(sequenceId: string): PendingDecisionPayload | undefined {
    return this.pending.get(sequenceId)
  }

  async clearPending(sequenceId: string): Promise<void> {
    this.pending.delete(sequenceId)
  }

  readAllPending(): readonly PendingDecisionPayload[] {
    return Array.from(this.pending.values())
  }

  getCurrentCombat(): MaybeCombatSnapshot {
    return this.combat
  }
}
