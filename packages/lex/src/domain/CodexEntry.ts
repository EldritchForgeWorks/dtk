export interface CodexEntry {
  readonly slug: string;
  readonly displayName: string;
  readonly description?: string;
  readonly condition?: string;
}

export function validateCodexEntry(entry: unknown, index: number): CodexEntry {
  if (typeof entry !== 'object' || entry === null) {
    throw new Error(`CodexEntry at index ${index}: expected an object`);
  }
  const e = entry as Record<string, unknown>;
  if (typeof e['slug'] !== 'string' || e['slug'].trim() === '') {
    throw new Error(`CodexEntry at index ${index}: 'slug' must be a non-empty string`);
  }
  if (typeof e['displayName'] !== 'string' || e['displayName'].trim() === '') {
    throw new Error(`CodexEntry at index ${index}: missing required field 'displayName' (slug: ${e['slug']})`);
  }
  return e as unknown as CodexEntry;
}
