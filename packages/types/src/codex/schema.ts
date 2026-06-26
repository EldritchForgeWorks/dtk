import { z } from 'zod'

export const CodexSchema = z
  .object({
    systemId: z.string().min(1, 'systemId must be a non-empty string'),
    attributes: z.array(z.string()),
    skills: z.array(z.string()),
    derived: z.array(z.string()),
    damageTypes: z.array(z.string()),
    currencies: z.array(z.string()),
  })
  .superRefine((codex, ctx) => {
    const fields = [
      { key: 'attributes', values: codex.attributes },
      { key: 'skills', values: codex.skills },
      { key: 'derived', values: codex.derived },
      { key: 'damageTypes', values: codex.damageTypes },
      { key: 'currencies', values: codex.currencies },
    ] as const

    const seen = new Map<string, string>()

    for (const { key, values } of fields) {
      for (let i = 0; i < values.length; i++) {
        const slug = values[i]
        /* v8 ignore next */ if (slug === undefined) continue
        const prior = seen.get(slug)
        if (prior !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Slug "${slug}" in ${key}[${i}] duplicates a slug already found in ${prior}`,
            path: [key, i],
          })
        } else {
          seen.set(slug, `${key}[${i}]`)
        }
      }
    }
  })

export type Codex = z.infer<typeof CodexSchema>
