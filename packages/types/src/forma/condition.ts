import { z } from 'zod'

const ComparisonConditionSchema = z.object({
  op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']),
  field: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

type Condition =
  | z.infer<typeof ComparisonConditionSchema>
  | { op: 'and'; conditions: Condition[] }
  | { op: 'or'; conditions: Condition[] }
  | { op: 'not'; condition: Condition }

const ConditionSchemaBase: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion('op', [
    ComparisonConditionSchema,
    z.object({ op: z.literal('and'), conditions: z.array(ConditionSchemaBase) }),
    z.object({ op: z.literal('or'), conditions: z.array(ConditionSchemaBase) }),
    z.object({ op: z.literal('not'), condition: ConditionSchemaBase }),
  ])
)

export const ConditionSchema = ConditionSchemaBase
export type { Condition }
