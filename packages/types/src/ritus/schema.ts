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

const TIER_NAME_PATTERN = /^[a-z][a-z0-9-]*$/

export const RitusTiersSchema = z.record(
  z.string().regex(TIER_NAME_PATTERN, 'tier names must be lowercase slugs matching /^[a-z][a-z0-9-]*$/'),
  z.number().int().nonnegative('tier thresholds must be nonnegative integers'),
).superRefine((tiers, ctx) => {
  const entries = Object.entries(tiers)
  if (entries.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'tiers must declare at least one entry',
    })
    return
  }
  const seen = new Map<number, string>()
  for (const [name, threshold] of entries) {
    const prior = seen.get(threshold)
    if (prior !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `tiers "${prior}" and "${name}" share threshold ${threshold} — tier thresholds must be unique so a hit count resolves to exactly one tier`,
        path: [name],
      })
    } else {
      seen.set(threshold, name)
    }
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
}).strict().superRefine((data, ctx) => {
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
export type RitusTiers = Readonly<Record<string, number>>
export type Ritus = z.infer<typeof RitusSchema>
