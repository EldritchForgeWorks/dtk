export interface CharacterBuild {
  systemId: string
  steps: Record<string, unknown>
  advancements: PurchasedAdvancement[]
  paradigmState: ParadigmState
}

export interface PurchasedAdvancement {
  advancementId: string
  purchasedAt: number
}

export type ParadigmState =
  | { paradigm: 'xp'; xpSpent: number; xpTotal: number }
  | { paradigm: 'milestone'; milestonesRemaining: number }
  | { paradigm: 'resource'; resourceKey: string; resourceValue: number }
  | { paradigm: 'practice'; practiceLog: Record<string, number> }
  | { paradigm: 'marks'; unspentMarks: number }
  | { paradigm: 'session'; advancementsRemaining: number }

export interface OpusApi {
  openCreationWizard(actor: unknown, systemId: string): Promise<CharacterBuild | null>
  openAdvancementTracker(actor: unknown): Promise<void>
  readonly isReady: boolean
}
