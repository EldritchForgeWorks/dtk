export interface CombatSnapshot {
  readonly round: number
  readonly turn: number
  readonly combatantId: string
  readonly combatId: string
}

export type MaybeCombatSnapshot = CombatSnapshot | null
