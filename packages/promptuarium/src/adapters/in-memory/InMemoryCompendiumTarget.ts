import type { ICompendiumTarget } from '../../ports/ICompendiumTarget.js';
import type { CompiledEntry } from '../../domain/value-objects/CompiledEntry.js';

export class InMemoryCompendiumTarget implements ICompendiumTarget {
  readonly written: Array<{ packId: string; entries: CompiledEntry[] }> = [];

  write(packId: string, entries: CompiledEntry[]): Promise<void> {
    this.written.push({ packId, entries: [...entries] });
    return Promise.resolve();
  }

  entriesFor(packId: string): CompiledEntry[] {
    return this.written
      .filter(w => w.packId === packId)
      .flatMap(w => w.entries);
  }

  clear(): void {
    this.written.length = 0;
  }
}
