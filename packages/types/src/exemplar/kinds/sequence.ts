import { z } from 'zod'
import { ExemplarBaseSchema } from './class-layer.js'

// ─── Actor enum ───────────────────────────────────────────────────────────────

const ActorSchema = z.enum(['initiator', 'target', 'gm', 'all'])

// ─── AwaitSpec ────────────────────────────────────────────────────────────────

export const AwaitSpecSchema = z.object({
  type: z.literal('player-decision'),
  choices: z.array(z.string()).min(1),
  timeout: z.number().optional(),
  default: z.string().optional(),
  actor: ActorSchema.optional(),
})

// ─── SequenceStep (with superRefine for exactly one of rule/sequence) ─────────

export type SequenceStep = {
  id: string
  rule?: string | undefined
  sequence?: string | undefined
  actor?: 'initiator' | 'target' | 'gm' | 'all' | undefined
  condition?: string | undefined
  await?: z.infer<typeof AwaitSpecSchema> | undefined
  inputs?: Record<string, string> | undefined
}

export const SequenceStepSchema: z.ZodType<SequenceStep> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1),
      rule: z.string().min(1).optional(),
      sequence: z.string().min(1).optional(),
      actor: ActorSchema.optional(),
      condition: z.string().optional(),
      await: AwaitSpecSchema.optional(),
      inputs: z.record(z.string(), z.string()).optional(),
    })
    .superRefine((step, ctx) => {
      const hasRule = step.rule !== undefined
      const hasSequence = step.sequence !== undefined
      if (!hasRule && !hasSequence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SequenceStep must have exactly one of "rule" or "sequence"',
          path: [],
        })
      } else if (hasRule && hasSequence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SequenceStep must have exactly one of "rule" or "sequence", not both',
          path: [],
        })
      }
    })
)

// ─── Sequence Exemplar ────────────────────────────────────────────────────────

export const SequenceExemplarSchema = ExemplarBaseSchema.extend({
  kind: z.literal('sequence'),
  steps: z.array(SequenceStepSchema).min(1),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type AwaitSpec = z.infer<typeof AwaitSpecSchema>
export type SequenceExemplar = z.infer<typeof SequenceExemplarSchema>
