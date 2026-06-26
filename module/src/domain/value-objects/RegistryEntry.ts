import { z } from 'zod'

const semverRegex = /^\d+\.\d+\.\d+$/

export const RegistryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: z.enum(['free', 'premium']),
  latestVersion: z.string().regex(semverRegex, 'latestVersion must be a three-part numeric version (e.g. 1.2.3)'),
  manifestUrl: z.string().url(),
  description: z.string(),
  dependencies: z.array(z.string()),
  changelogUrl: z.string().url().optional(),
})

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>

export function parseRegistryEntry(raw: unknown): RegistryEntry {
  return RegistryEntrySchema.parse(raw)
}
