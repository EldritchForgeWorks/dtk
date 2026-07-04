import { join } from 'node:path';
import { ClassicLevel } from 'classic-level';
import type { CompiledEntry } from '../../domain/value-objects/CompiledEntry.js';
import type { ICompendiumTarget, PackDocumentClass } from '../../ports/ICompendiumTarget.js';

// Foundry V12+ LevelDB packs key by COLLECTION (`items`, `actors`), never by
// the document's own DTK subtype — `dtk-shadowrun`'s hand-rolled
// `build-packs.mjs` proves this is what Foundry actually reads; the prior
// `!${entry.type}!${entry._id}` keying (e.g. `!ritus!...`) produced a
// database Foundry cannot load. Fixed 2026-07-04 (upstream ask U-M3-1 /
// DTK change `fix-promptuarium-compile-mapping`, F5).
const COLLECTION: Record<PackDocumentClass, string> = { Item: 'items', Actor: 'actors' };

export class LevelDBCompendiumTarget implements ICompendiumTarget {
  constructor(private readonly outputDir: string) {}

  async write(
    packId: string,
    entries: CompiledEntry[],
    documentClass: PackDocumentClass = 'Item',
  ): Promise<void> {
    const collection = COLLECTION[documentClass];
    const db = new ClassicLevel<string, CompiledEntry>(join(this.outputDir, packId), {
      valueEncoding: 'json',
    });
    try {
      await db.open();
      await db.batch(
        entries.map(entry => ({
          type: 'put' as const,
          key: `!${collection}!${entry._id}`,
          value: entry,
        })),
      );
    } finally {
      await db.close();
    }
  }
}
