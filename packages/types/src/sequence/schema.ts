import { z } from 'zod'

const StepConditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte']),
  value: z.unknown(),
})

const MechanicTierConsequenceSchema = z.object({
  damage: z.string().optional(),
  chain: z.object({ pool: z.string(), mechanic: z.string() }).optional(),
  effect: z.string().optional(),
  message: z.string().optional(),
})

const MechanicRuleStepSchema = z.object({
  type: z.literal('rule'),
  id: z.string().min(1),
  pool: z.string().min(1),
  ritus: z.string().optional(),        // Foundry UUID for compendium-referenced Ritus
  opposed: z.string().optional(),
  threshold: z.number().int().positive().optional(),
  tiers: z.record(z.string(), z.number()).optional(),
  condition: StepConditionSchema.optional(),
  on_tier: z.record(z.string(), MechanicTierConsequenceSchema).optional(),
})

// on_skip: non-standard field on await steps (AGENTS.md, dtk-alea's
// SequenceExecutor.ts) — when the await is skipped (its condition is false),
// on_skip.message is injected as the preceding rule card's message field.
// Real runtime behavior with no prior schema representation (SequenceExecutor
// read it via an untyped cast); added here so it round-trips through
// validation instead of being silently stripped by non-strict z.object().
const MechanicOnSkipSchema = z.object({
  message: z.string(),
})

const MechanicAwaitStepSchema = z.object({
  type: z.literal('await'),
  id: z.string().min(1),
  choices: z.array(z.string()),
  timeout: z.number().optional(),
  default: z.string().nullable().optional(),
  condition: StepConditionSchema.optional(),
  on_skip: MechanicOnSkipSchema.optional(),
})

export const MechanicSequenceStepSchema = z.discriminatedUnion('type', [
  MechanicRuleStepSchema,
  MechanicAwaitStepSchema,
])

export const MechanicSequenceExemplarSchema = z.object({
  id: z.string().min(1),
  systemId: z.string().min(1),
  steps: z.array(MechanicSequenceStepSchema),
})

export type MechanicSequenceStep = z.infer<typeof MechanicSequenceStepSchema>
export type MechanicSequenceExemplar = z.infer<typeof MechanicSequenceExemplarSchema>
