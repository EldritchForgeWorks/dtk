import { join } from 'node:path';
import { ClassicLevel } from 'classic-level';
import type { CompiledEntry } from '../../domain/value-objects/CompiledEntry.js';
import type { ICompendiumTarget } from '../../ports/ICompendiumTarget.js';

export class LevelDBCompendiumTarget implements ICompendiumTarget {
  constructor(private readonly outputDir: string) {}

  async write(packId: string, entries: CompiledEntry[]): Promise<void> {
    const db = new ClassicLevel<string, CompiledEntry>(join(this.outputDir, packId), {
      valueEncoding: 'json',
    });
    try {
      await db.open();
      await db.batch(
        entries.map(entry => ({
          type: 'put' as const,
          key: `!${entry.type}!${entry._id}`,
          value: entry,
        })),
      );
    } finally {
      await db.close();
    }
  }
}
