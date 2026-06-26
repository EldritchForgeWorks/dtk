import type { ICodexStore } from '../../ports/ICodexStore.js';
import type { CodexEntry } from '../../domain/CodexEntry.js';

export class InMemoryCodexStore implements ICodexStore {
  private readonly _store = new Map<string, CodexEntry[]>();

  seed(systemId: string, entries: CodexEntry[]): void {
    this._store.set(systemId, [...entries]);
  }

  async save(systemId: string, entries: CodexEntry[]): Promise<void> {
    this._store.set(systemId, [...entries]);
  }

  async load(systemId: string): Promise<CodexEntry[]> {
    return [...(this._store.get(systemId) ?? [])];
  }

  async loadAll(): Promise<Record<string, CodexEntry[]>> {
    const result: Record<string, CodexEntry[]> = {};
    for (const [id, entries] of this._store) {
      result[id] = [...entries];
    }
    return result;
  }
}
