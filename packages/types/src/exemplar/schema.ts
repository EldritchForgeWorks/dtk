import { z } from 'zod'
import {
  SpeciesExemplarSchema,
  ArchetypeExemplarSchema,
  DisciplineExemplarSchema,
  VocationExemplarSchema,
  ItemExemplarSchema,
  BackgroundExemplarSchema,
  OriginExemplarSchema,
  FeatureExemplarSchema,
  ExemplarBaseSchema,
} from './kinds/class-layer.js'
import { RuleExemplarSchema } from './kinds/rule.js'
import { SequenceExemplarSchema } from './kinds/sequence.js'
import { ActionExemplarSchema } from './kinds/action.js'

// ─── Re-export base ───────────────────────────────────────────────────────────

export { ExemplarBaseSchema }
export type { ExemplarBase } from './kinds/class-layer.js'

// ─── Discriminated union on "kind" ────────────────────────────────────────────

export const ExemplarSchema = z.discriminatedUnion('kind', [
  SpeciesExemplarSchema,
  ArchetypeExemplarSchema,
  DisciplineExemplarSchema,
  VocationExemplarSchema,
  ItemExemplarSchema,
  BackgroundExemplarSchema,
  OriginExemplarSchema,
  FeatureExemplarSchema,
  RuleExemplarSchema,
  SequenceExemplarSchema,
  ActionExemplarSchema,
])

// ─── Types ────────────────────────────────────────────────────────────────────

export type Exemplar = z.infer<typeof ExemplarSchema>

export type {
  SpeciesExemplar,
  ArchetypeExemplar,
  DisciplineExemplar,
  VocationExemplar,
  ItemExemplar,
  BackgroundExemplar,
  OriginExemplar,
  FeatureExemplar,
} from './kinds/class-layer.js'

export type { RuleExemplar, TierConsequence, ChainDef } from './kinds/rule.js'
export type { SequenceExemplar, SequenceStep, AwaitSpec } from './kinds/sequence.js'
export type { ActionExemplar, TargetingSpec, ActionCost } from './kinds/action.js'
