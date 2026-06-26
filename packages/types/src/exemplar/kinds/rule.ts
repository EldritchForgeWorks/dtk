import { z } from 'zod'
import { ExemplarBaseSchema } from './class-layer.js'

// ─── TierConsequence ──────────────────────────────────────────────────────────

export const TierConsequenceSchema = z.object({
  damage: z.string().optional(),
  chain: z.string().optional(),
  effect: z.string().optional(),
  chat: z.string().optional(),
})

// ─── ChainDef ─────────────────────────────────────────────────────────────────

export const ChainDefSchema = z.object({
  pool: z.string().min(1),
  opposed: z.string().optional(),
})

// ─── Rule Exemplar ────────────────────────────────────────────────────────────

export const RuleExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('rule'),
  ritus: z.string().min(1),
  pool: z.string().min(1),
  opposed: z.string().optional(),
  mechanic: z.enum(['pool-count', 'pool-sum', 'single-die', 'roll-under']).optional(),
  threshold: z.number().optional(),
  tiers: z
    .object({
      critical: z.number().optional(),
      hit: z.number().optional(),
      glancing: z.number().optional(),
    })
    .optional(),
  on_tier: z.record(z.string(), TierConsequenceSchema).optional(),
  chains: z.record(z.string(), ChainDefSchema).optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type TierConsequence = z.infer<typeof TierConsequenceSchema>
export type ChainDef = z.infer<typeof ChainDefSchema>
export type RuleExemplar = z.infer<typeof RuleExemplarSchema>
