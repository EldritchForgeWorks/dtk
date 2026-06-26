import { z } from 'zod'
import { ExemplarBaseSchema } from './class-layer.js'

// ─── TargetingSpec ────────────────────────────────────────────────────────────

export const SelfTargetingSchema = z.object({
  mode: z.literal('self'),
})

export const NoneTargetingSchema = z.object({
  mode: z.literal('none'),
})

// Plain ZodObject — no superRefine — so it can be used in z.discriminatedUnion
// (which requires .shape on each member to extract the discriminator value).
const TokenTargetingObjectSchema = z.object({
  mode: z.literal('token'),
  min: z.number().int().nonnegative().optional(),
  max: z.union([z.number().int().nonnegative(), z.null()]).optional(),
  filter: z.string().optional(),
  execution: z.enum(['per-target', 'once']).optional(),
})

// Full validated version with the cross-field min <= max constraint.
export const TokenTargetingSchema = TokenTargetingObjectSchema.superRefine((val, ctx) => {
  if (
    val.min !== undefined &&
    val.max !== undefined &&
    val.max !== null &&
    val.min > val.max
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `targeting.min (${val.min}) must be <= targeting.max (${val.max})`,
      path: ['min'],
    })
  }
})

export const AreaTargetingSchema = z.object({
  mode: z.literal('area'),
  shape: z.enum(['circle', 'cone', 'line', 'ray']),
  size: z.number().positive(),
  width: z.number().positive().optional(),
})

// TargetingSpecSchema uses z.union (not discriminatedUnion) so it can include
// TokenTargetingSchema (a ZodEffects wrapper). This means ActionExemplarSchema
// stays a plain ZodObject and can safely participate in ExemplarSchema's
// discriminatedUnion on 'kind'.
export const TargetingSpecSchema = z.union([
  SelfTargetingSchema,
  NoneTargetingSchema,
  TokenTargetingSchema,
  AreaTargetingSchema,
])

// ─── ActionCost ───────────────────────────────────────────────────────────────

export const ActionCostSchema = z.object({
  actionPoints: z.number().int().nonnegative().optional(),
  bonusActions: z.number().int().nonnegative().optional(),
  reactions: z.number().int().nonnegative().optional(),
})

// ─── Action Exemplar ──────────────────────────────────────────────────────────

// Plain ZodObject (no superRefine) so ExemplarSchema's discriminatedUnion can
// extract the 'kind' discriminator from .shape.
export const ActionExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('action'),
  sequence: z.string().min(1),
  targeting: TargetingSpecSchema,
  cost: ActionCostSchema.optional(),
  hint: z.string().optional(),
  icon: z.string().optional(),
  condition: z.string().optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type SelfTargeting = z.infer<typeof SelfTargetingSchema>
export type NoneTargeting = z.infer<typeof NoneTargetingSchema>
export type TokenTargeting = z.infer<typeof TokenTargetingSchema>
export type AreaTargeting = z.infer<typeof AreaTargetingSchema>
export type TargetingSpec = z.infer<typeof TargetingSpecSchema>
export type ActionCost = z.infer<typeof ActionCostSchema>
export type ActionExemplar = z.infer<typeof ActionExemplarSchema>
