import type { AdvancementConfig } from './Forma'

export interface PurchasedAdvancement {
  id: string
  purchasedAt: number
}

export type ParadigmState =
  | { paradigm: 'xp'; currency: string; total: number; spent: number }
  | { paradigm: 'milestone'; milestonesGranted: number; advancementsRemaining: number }
  | { paradigm: 'resource'; currency: string }
  | { paradigm: 'practice'; practiceLog: Record<string, number> }
  | { paradigm: 'marks'; currency: string; total: number; spent: number }
  | { paradigm: 'session'; sessionsCompleted: number; advancementsRemaining: number }

export interface CharacterBuild {
  systemId: string
  steps: Record<string, unknown>
  advancements: PurchasedAdvancement[]
  paradigmState: ParadigmState
}

export function initialParadigmState(config: AdvancementConfig): ParadigmState {
  switch (config.paradigm) {
    case 'xp':
      return { paradigm: 'xp', currency: config.currency ?? 'XP', total: config.starting, spent: 0 }
    case 'milestone':
      return { paradigm: 'milestone', milestonesGranted: 0, advancementsRemaining: 0 }
    case 'resource':
      return { paradigm: 'resource', currency: config.currency ?? 'Resource' }
    case 'practice':
      return { paradigm: 'practice', practiceLog: {} }
    case 'marks':
      return { paradigm: 'marks', currency: config.currency ?? 'Marks', total: 0, spent: 0 }
    case 'session':
      return { paradigm: 'session', sessionsCompleted: 0, advancementsRemaining: 0 }
  }
}

export function emptyBuild(systemId: string, config?: AdvancementConfig): CharacterBuild {
  return {
    systemId,
    steps: {},
    advancements: [],
    paradigmState: config
      ? initialParadigmState(config)
      : { paradigm: 'xp', currency: 'XP', total: 0, spent: 0 },
  }
}

export function serialise(build: CharacterBuild): string {
  return JSON.stringify(build)
}

export function deserialise(json: string): CharacterBuild {
  return JSON.parse(json) as CharacterBuild
}
