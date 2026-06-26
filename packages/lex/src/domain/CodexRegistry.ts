import { type CodexEntry, validateCodexEntry } from './CodexEntry.js';

export class CodexRegistry {
  private readonly _systems = new Map<string, Map<string, CodexEntry>>();

  register(systemId: string, entries: CodexEntry[]): void {
    if (this._systems.has(systemId)) {
      console.warn(`CodexRegistry: re-registering system "${systemId}" — replacing all prior entries`);
    }
    const map = new Map<string, CodexEntry>();
    entries.forEach((entry, index) => {
      const validated = validateCodexEntry(entry, index);
      map.set(validated.slug, validated);
    });
    this._systems.set(systemId, map);
  }

  resolve(systemId: string, slug: string): CodexEntry | null {
    return this._systems.get(systemId)?.get(slug) ?? null;
  }

  listSlugs(systemId: string): string[] {
    const map = this._systems.get(systemId);
    if (!map) return [];
    return [...map.keys()].sort();
  }

  exportJson(systemId: string): Record<string, string> {
    const map = this._systems.get(systemId);
    if (!map) return {};
    const result: Record<string, string> = {};
    for (const [slug, entry] of map) {
      result[slug] = entry.displayName;
    }
    return result;
  }

  listConditionSlugs(systemId: string): string[] {
    const map = this._systems.get(systemId);
    if (!map) return [];
    return [...map.values()]
      .filter(e => e.condition != null && e.condition !== '')
      .map(e => e.slug)
      .sort();
  }
}
