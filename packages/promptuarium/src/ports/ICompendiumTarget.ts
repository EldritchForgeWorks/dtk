import type { CompiledEntry } from '../domain/value-objects/CompiledEntry.js';

/** Which Foundry collection a pack's documents belong to — determines the
 *  LevelDB key prefix (`items`/`actors`). Every DTK content kind compiled
 *  today is `'Item'`; the parameter exists so the encoding is derived, not
 *  hardcoded, for when an Actor-producing kind eventually shows up. */
export type PackDocumentClass = 'Item' | 'Actor';

export interface ICompendiumTarget {
  write(packId: string, entries: CompiledEntry[], documentClass?: PackDocumentClass): Promise<void>;
}
