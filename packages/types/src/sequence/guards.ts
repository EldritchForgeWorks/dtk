import { MechanicSequenceExemplarSchema } from './schema.js'
import type { MechanicSequenceExemplar } from './schema.js'

export function isMechanicSequenceExemplar(value: unknown): value is MechanicSequenceExemplar {
  return MechanicSequenceExemplarSchema.safeParse(value).success
}
