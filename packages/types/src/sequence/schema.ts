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

const MechanicAwaitStepSchema = z.object({
  type: z.literal('await'),
  id: z.string().min(1),
  choices: z.array(z.string()),
  timeout: z.number().optional(),
  default: z.string().nullable().optional(),
  condition: StepConditionSchema.optional(),
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
