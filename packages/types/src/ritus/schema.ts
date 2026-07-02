import { z } from 'zod'

export const RitusMechanicSchema = z.enum([
  'standard',
  'pool-count',
  'pool-sum',
  'exploding',
  'step-die',
  'roll-under',
  'advantage-disadvantage',
  'target-number',
  'drama-die',
  'custom',
])

export const RitusTiersSchema = z.object({
  critical: z.number().int().nonnegative().optional(),
  hit: z.number().int().nonnegative(),
  glancing: z.number().int().nonnegative().optional(),
}).superRefine((tiers, ctx) => {
  if (tiers.critical !== undefined && tiers.critical <= tiers.hit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `tiers.critical (${tiers.critical}) must be greater than tiers.hit (${tiers.hit})`,
      path: ['critical'],
    })
  }
  if (tiers.glancing !== undefined && tiers.glancing >= tiers.hit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `tiers.glancing (${tiers.glancing}) must be less than tiers.hit (${tiers.hit})`,
      path: ['glancing'],
    })
  }
})

export const RitusSchema = z.object({
  id: z.string().min(1, 'id must be a non-empty string'),
  name: z.string().min(1, 'name must be a non-empty string'),
  mechanic: RitusMechanicSchema,
  sides: z.number().int().min(2, 'sides must be an integer ≥ 2'),
  explodes: z.boolean().optional(),
  keepMode: z.enum(['highest', 'lowest']).optional(),
  threshold: z.number().int().positive('threshold must be a positive integer'),
  tiers: RitusTiersSchema,
}).superRefine((data, ctx) => {
  if (data.mechanic === 'advantage-disadvantage' && data.keepMode === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'keepMode is required when mechanic is "advantage-disadvantage"',
      path: ['keepMode'],
    })
  }
}).transform(data => ({
  ...data,
  explodes: data.explodes ?? (data.mechanic === 'exploding'),
}))

export type RitusMechanic = z.infer<typeof RitusMechanicSchema>
export type RitusTiers = z.infer<typeof RitusTiersSchema>
export type Ritus = z.infer<typeof RitusSchema>
