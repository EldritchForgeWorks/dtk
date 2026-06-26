export type ExemplarKind = string

export interface ChoiceStep {
  id: string
  title: string
  kind: 'choices'
  from: ExemplarKind
  max: number
  required?: boolean
}

export interface PointBuyStep {
  id: string
  title: string
  kind: 'point-buy'
  spend_on: 'attributes' | 'skills'
  pool: string
  required?: boolean
}

export interface FreeTextStep {
  id: string
  title: string
  kind: 'free-text'
  required?: boolean
}

export type FormaStep = ChoiceStep | PointBuyStep | FreeTextStep

export interface AdvancementTrack {
  id: string
  title: string
  cost: number
  requires?: string
  unlock_after?: string
}

export type AdvancementConfig =
  | { paradigm: 'xp'; currency?: string; starting: number; tracks: AdvancementTrack[] }
  | { paradigm: 'milestone'; per_milestone: number; tracks: AdvancementTrack[] }
  | { paradigm: 'resource'; resource: string; currency?: string; tracks: AdvancementTrack[] }
  | { paradigm: 'practice'; check_at: 'session_end'; check_expression: string; tracks: AdvancementTrack[] }
  | { paradigm: 'marks'; marks_per_session: number; currency?: string; tracks: AdvancementTrack[] }
  | { paradigm: 'session'; sessions_per_advance: number; tracks: AdvancementTrack[] }

export interface Forma {
  systemId: string
  steps: FormaStep[]
  advancement: AdvancementConfig
}
