import { z } from 'zod'
import { WizardStepSchema } from './step.js'

export const AdvancementSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  cost: z.number(),
  prerequisite: z.string().optional(),
  unlockStep: z.string().optional(),
})

export const AdvancementTrackSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  xpTable: z.array(z.number()),
  advancements: z.array(AdvancementSchema),
})

export const FormaSchema = z
  .object({
    id: z.string().min(1),
    systemId: z.string().min(1),
    creationSteps: z.array(WizardStepSchema).min(1),
    outputMapper: z.string().min(1),
    advancementTracks: z.array(AdvancementTrackSchema).optional(),
  })
  .superRefine((forma, ctx) => {
    const seen = new Set<string>()
    for (let i = 0; i < forma.creationSteps.length; i++) {
      const step = forma.creationSteps[i]
      /* v8 ignore next */ if (step === undefined) continue
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate step id "${step.id}" at creationSteps[${i}]`,
          path: ['creationSteps', i, 'id'],
        })
      } else {
        seen.add(step.id)
      }
    }
  })

export type Advancement = z.infer<typeof AdvancementSchema>
export type AdvancementTrack = z.infer<typeof AdvancementTrackSchema>
export type Forma = z.infer<typeof FormaSchema>
