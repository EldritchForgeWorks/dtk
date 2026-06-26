import { z } from 'zod'

export const RitusMechanicSchema = z.enum(['pool-count', 'pool-sum', 'single-die', 'roll-under'])

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
  threshold: z.number().int().positive('threshold must be a positive integer'),
  tiers: RitusTiersSchema,
})

export type RitusMechanic = z.infer<typeof RitusMechanicSchema>
export type RitusTiers = z.infer<typeof RitusTiersSchema>
export type Ritus = z.infer<typeof RitusSchema>
