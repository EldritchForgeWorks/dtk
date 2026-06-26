import { ModusSchema, type Modus } from './schema.js'

export function isModus(value: unknown): value is Modus {
  return ModusSchema.safeParse(value).success
}
