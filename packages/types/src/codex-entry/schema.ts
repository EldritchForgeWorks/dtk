import { z } from 'zod'

export const CodexEntryItemSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  description: z.string().optional(),
  category: z.string().optional(),   // e.g. "attribute", "skill", "damage-type", "currency"
})

export type CodexEntryItem = z.infer<typeof CodexEntryItemSchema>
