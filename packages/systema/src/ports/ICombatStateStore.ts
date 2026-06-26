import type { PendingDecisionPayload } from '../domain/entities/PendingDecision.js'
import type { MaybeCombatSnapshot } from '../domain/value-objects/CombatSnapshot.js'

export interface ICombatStateStore {
  writePending(sequenceId: string, payload: PendingDecisionPayload): Promise<void>
  readPending(sequenceId: string): PendingDecisionPayload | undefined
  clearPending(sequenceId: string): Promise<void>
  readAllPending(): readonly PendingDecisionPayload[]
  getCurrentCombat(): MaybeCombatSnapshot
}
