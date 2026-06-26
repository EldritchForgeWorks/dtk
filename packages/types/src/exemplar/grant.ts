import { z } from 'zod'

// ─── Modifier Grant ───────────────────────────────────────────────────────────

export const ModifierGrantSchema = z.object({
  type: z.literal('modifier'),
  path: z.string().min(1),
  value: z.union([z.number(), z.string(), z.boolean()]),
})

// ─── Reference Grant ──────────────────────────────────────────────────────────

export const ReferenceGrantSchema = z.object({
  type: z.literal('reference'),
  exemplarId: z.string().min(1),
})

// ─── Choice Grant (recursive via z.lazy) ─────────────────────────────────────

export type Grant =
  | z.infer<typeof ModifierGrantSchema>
  | z.infer<typeof ReferenceGrantSchema>
  | { type: 'choice'; label: string; choose: number; from: Grant[] }
  | { type: 'rule-modifier'; ruleId: string; overrides: Record<string, unknown> }

// RuleModifierGrantBaseSchema is a plain ZodObject (no superRefine) so it can
// participate in z.discriminatedUnion (which requires .shape on each member).
const RuleModifierGrantObjectSchema = z.object({
  type: z.literal('rule-modifier'),
  ruleId: z.string().min(1),
  overrides: z.record(z.string(), z.unknown()),
})

// Full validated version with the at-least-one-key constraint on overrides.
export const RuleModifierGrantSchema = RuleModifierGrantObjectSchema.superRefine((val, ctx) => {
  if (Object.keys(val.overrides).length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'overrides must have at least one key',
      path: ['overrides'],
    })
  }
})

// GrantSchema uses z.union (not discriminatedUnion) so that RuleModifierGrantSchema
// (a ZodEffects) and ChoiceGrantSchema (also ZodEffects via z.lazy) are both valid
// members. z.union handles them correctly at runtime.
export const GrantSchema: z.ZodType<Grant> = z.lazy(() =>
  z.union([
    ModifierGrantSchema,
    ReferenceGrantSchema,
    ChoiceGrantSchema,
    RuleModifierGrantSchema,
  ])
)

export const ChoiceGrantSchema: z.ZodType<{
  type: 'choice'
  label: string
  choose: number
  from: Grant[]
}> = z.lazy(() =>
  z.object({
    type: z.literal('choice'),
    label: z.string().min(1),
    choose: z.number().int().positive(),
    from: z.array(GrantSchema),
  })
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModifierGrant = z.infer<typeof ModifierGrantSchema>
export type ReferenceGrant = z.infer<typeof ReferenceGrantSchema>
export type ChoiceGrant = z.infer<typeof ChoiceGrantSchema>
export type RuleModifierGrant = z.infer<typeof RuleModifierGrantSchema>
