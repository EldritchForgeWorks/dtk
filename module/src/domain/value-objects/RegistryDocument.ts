import { z } from 'zod'
import { RegistryEntrySchema } from './RegistryEntry'

export const RegistryDocumentSchema = z.object({
  version: z.literal(1),
  modules: z.array(RegistryEntrySchema),
})

export type RegistryDocument = z.infer<typeof RegistryDocumentSchema>

export function parseRegistryDocument(raw: unknown): RegistryDocument {
  return RegistryDocumentSchema.parse(raw)
}
