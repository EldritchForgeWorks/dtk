import type { ICompendiumTarget, PackDocumentClass } from '../../ports/ICompendiumTarget.js';
import type { CompiledEntry } from '../../domain/value-objects/CompiledEntry.js';

export class InMemoryCompendiumTarget implements ICompendiumTarget {
  readonly written: Array<{ packId: string; entries: CompiledEntry[]; documentClass: PackDocumentClass }> = [];

  write(packId: string, entries: CompiledEntry[], documentClass: PackDocumentClass = 'Item'): Promise<void> {
    this.written.push({ packId, entries: [...entries], documentClass });
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
