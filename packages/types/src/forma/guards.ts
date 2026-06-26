import { FormaSchema, type Forma } from './schema.js'

export function isForma(value: unknown): value is Forma {
  return FormaSchema.safeParse(value).success
}
