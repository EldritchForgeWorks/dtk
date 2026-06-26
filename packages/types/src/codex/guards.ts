import { CodexSchema, type Codex } from './schema.js'

export function isCodex(value: unknown): value is Codex {
  return CodexSchema.safeParse(value).success
}
