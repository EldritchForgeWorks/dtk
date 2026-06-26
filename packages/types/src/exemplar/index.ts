// ─── Grant schemas and types ──────────────────────────────────────────────────

export {
  ModifierGrantSchema,
  ReferenceGrantSchema,
  ChoiceGrantSchema,
  RuleModifierGrantSchema,
  GrantSchema,
} from './grant.js'

export type {
  ModifierGrant,
  ReferenceGrant,
  ChoiceGrant,
  RuleModifierGrant,
  Grant,
} from './grant.js'

// ─── Class-layer kind schemas and types ───────────────────────────────────────

export {
  ExemplarBaseSchema,
  SpeciesExemplarSchema,
  ArchetypeExemplarSchema,
  DisciplineExemplarSchema,
  VocationExemplarSchema,
  ItemExemplarSchema,
  BackgroundExemplarSchema,
  OriginExemplarSchema,
  FeatureExemplarSchema,
} from './kinds/class-layer.js'

export type {
  ExemplarBase,
  SpeciesExemplar,
  ArchetypeExemplar,
  DisciplineExemplar,
  VocationExemplar,
  ItemExemplar,
  BackgroundExemplar,
  OriginExemplar,
  FeatureExemplar,
} from './kinds/class-layer.js'

// ─── Rule kind ────────────────────────────────────────────────────────────────

export { RuleExemplarSchema, TierConsequenceSchema, ChainDefSchema } from './kinds/rule.js'
export type { RuleExemplar, TierConsequence, ChainDef } from './kinds/rule.js'

// ─── Sequence kind ────────────────────────────────────────────────────────────

export {
  SequenceExemplarSchema,
  SequenceStepSchema,
  AwaitSpecSchema,
} from './kinds/sequence.js'

export type { SequenceExemplar, SequenceStep, AwaitSpec } from './kinds/sequence.js'

// ─── Action kind ──────────────────────────────────────────────────────────────

export {
  ActionExemplarSchema,
  TargetingSpecSchema,
  SelfTargetingSchema,
  NoneTargetingSchema,
  TokenTargetingSchema,
  AreaTargetingSchema,
  ActionCostSchema,
} from './kinds/action.js'

export type {
  ActionExemplar,
  TargetingSpec,
  SelfTargeting,
  NoneTargeting,
  TokenTargeting,
  AreaTargeting,
  ActionCost,
} from './kinds/action.js'

// ─── Top-level discriminated union ───────────────────────────────────────────

export { ExemplarSchema } from './schema.js'
export type { Exemplar } from './schema.js'

// ─── Guards ───────────────────────────────────────────────────────────────────

export {
  isExemplar,
  isSpecies,
  isArchetype,
  isDiscipline,
  isVocation,
  isItem,
  isBackground,
  isOrigin,
  isFeature,
  isRule,
  isSequence,
  isAction,
} from './guards.js'
