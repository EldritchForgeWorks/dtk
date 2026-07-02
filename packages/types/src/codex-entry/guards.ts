import { CodexEntryItemSchema } from './schema.js'
import type { CodexEntryItem } from './schema.js'

export function isCodexEntryItem(value: unknown): value is CodexEntryItem {
  return CodexEntryItemSchema.safeParse(value).success
}
