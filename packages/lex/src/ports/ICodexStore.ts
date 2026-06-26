import type { CodexEntry } from '../domain/CodexEntry.js';

export interface ICodexStore {
  save(systemId: string, entries: CodexEntry[]): Promise<void>;
  load(systemId: string): Promise<CodexEntry[]>;
  loadAll(): Promise<Record<string, CodexEntry[]>>;
}
