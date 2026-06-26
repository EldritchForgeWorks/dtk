import { z } from 'zod'

export const TextFieldSchema = z.object({
  type: z.literal('text'),
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
})

export const NumberFieldSchema = z.object({
  type: z.literal('number'),
  id: z.string().min(1),
  label: z.string().min(1),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean().optional(),
})

export const SelectFieldSchema = z.object({
  type: z.literal('select'),
  id: z.string().min(1),
  label: z.string().min(1),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  required: z.boolean().optional(),
})

export const AllocationFieldSchema = z.object({
  type: z.literal('allocation'),
  id: z.string().min(1),
  label: z.string().min(1),
  pool: z.string().min(1),
  targets: z.array(z.string()),
})

export const PriorityMatrixFieldSchema = z.object({
  type: z.literal('priority-matrix'),
  id: z.string().min(1),
  label: z.string().min(1),
  priorities: z.array(z.string()),
  choices: z.array(z.string()),
})

export const DerivedFieldSchema = z.object({
  type: z.literal('derived'),
  id: z.string().min(1),
  label: z.string().min(1),
  formula: z.string().min(1),
})

export const CustomFieldSchema = z.object({
  type: z.literal('custom'),
  id: z.string().min(1),
  label: z.string().min(1),
  componentId: z.string().min(1),
})

/**
 * A card-grid picker backed by live compendium exemplars.
 *
 * At render time the wizard queries dtk-promptuarium for all exemplars of `kind`
 * (scoped to `systemId` when provided), then:
 *   1. Applies `parentStepId` structural filter — keeps only exemplars whose
 *      `.parent` property matches the value stored in the in-progress build at
 *      the named step (e.g. `parentStepId: 'archetype'` gates disciplines by the
 *      chosen archetype id).
 *   2. Applies the optional `filter` Lex expression for anything more complex
 *      (evaluated with `@steps.*` context identical to alea sequences).
 *
 * The chosen exemplar's `id` is stored as the step value via `applyChoice`.
 */
export const ExemplarGridFieldSchema = z.object({
  type: z.literal('exemplar-grid'),
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.string().min(1),
  systemId: z.string().optional(),
  parentStepId: z.string().optional(),
  filter: z.string().optional(),
})

export const WizardFieldSchema = z.discriminatedUnion('type', [
  TextFieldSchema,
  NumberFieldSchema,
  SelectFieldSchema,
  AllocationFieldSchema,
  PriorityMatrixFieldSchema,
  DerivedFieldSchema,
  CustomFieldSchema,
  ExemplarGridFieldSchema,
])

export type TextField = z.infer<typeof TextFieldSchema>
export type NumberField = z.infer<typeof NumberFieldSchema>
export type SelectField = z.infer<typeof SelectFieldSchema>
export type AllocationField = z.infer<typeof AllocationFieldSchema>
export type PriorityMatrixField = z.infer<typeof PriorityMatrixFieldSchema>
export type DerivedField = z.infer<typeof DerivedFieldSchema>
export type CustomField = z.infer<typeof CustomFieldSchema>
export type ExemplarGridField = z.infer<typeof ExemplarGridFieldSchema>
export type WizardField = z.infer<typeof WizardFieldSchema>
