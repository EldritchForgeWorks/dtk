import type { CompiledEntry } from '../domain/value-objects/CompiledEntry.js';

export interface ICompendiumTarget {
  write(packId: string, entries: CompiledEntry[]): Promise<void>;
}
