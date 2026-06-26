import { RitusSchema, type Ritus } from './schema.js'

export function isRitus(value: unknown): value is Ritus {
  return RitusSchema.safeParse(value).success
}
