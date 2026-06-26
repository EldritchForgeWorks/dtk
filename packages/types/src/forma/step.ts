import { z } from 'zod'
import { ConditionSchema } from './condition.js'
import { WizardFieldSchema } from './field.js'

export const WizardStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  hint: z.string().optional(),
  condition: ConditionSchema.optional(),
  fields: z.array(WizardFieldSchema),
})

export type WizardStep = z.infer<typeof WizardStepSchema>
