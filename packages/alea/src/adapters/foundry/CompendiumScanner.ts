// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// Scans all enabled module compendium packs for `dtk.ritus` and `dtk.sequence`
// items and registers them in the domain registries. Defensive: logs warnings
// and skips invalid items; never throws from scanAll().
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const game: any;

import type { RitusRegistry } from '../../domain/services/RitusRegistry.js';
import type { SequenceExemplarRegistry } from '../../domain/services/SequenceExemplarRegistry.js';

export class CompendiumScanner {
  constructor(
    private readonly ritusRegistry: RitusRegistry,
    private readonly exemplarRegistry: SequenceExemplarRegistry,
  ) {}

  async scanAll(): Promise<void> {
    const start = Date.now();
    let ritusCount = 0;
    let seqCount = 0;

    for (const pack of game.packs) {
      if (pack.metadata.type !== 'Item') continue;

      try {
        await pack.getIndex();

        // Fetch all documents then filter client-side — avoids server-side query edge cases
        // with custom item types.
        const allItems = await pack.getDocuments();
        console.log(
          `[dtk-alea] CompendiumScanner: pack ${pack.collection} has ${allItems.length} docs`,
          allItems.map((i: any) => `${i.id}:${i.type}`),
        );

        for (const item of allItems) {
          if ((item as any).type === 'dtk.ritus') {
            try {
              const uuid = item.uuid as string;
              const mechanic = item.system.mechanic as string;
              const ritus = {
                id: (item.system.id as string) || (item.id as string),
                mechanic,
                sides: (item.system.sides as number | undefined) ?? 6,
                explodes: (item.system.explodes as boolean | undefined) ?? (mechanic === 'exploding'),
                keepMode: item.system.keepMode as 'highest' | 'lowest' | undefined,
                threshold: item.system.threshold as number,
                tiers: item.system.tiers as Record<string, number>,
              };
              this.ritusRegistry.register(ritus);
              this.ritusRegistry.registerByUUID(uuid, ritus);
              ritusCount++;
            } catch (e) {
              console.warn(
                `[dtk-alea] CompendiumScanner: skipping invalid dtk.ritus item ${(item as any).id}`,
                e,
              );
            }
          } else if ((item as any).type === 'dtk.sequence') {
            try {
              const uuid = item.uuid as string;
              this.exemplarRegistry.register(uuid, {
                id: (item.system.id as string) || (item.id as string),
                systemId: item.system.systemId as string,
                steps: (item.system.steps as any[]) ?? [],
              });
              seqCount++;
            } catch (e) {
              console.warn(
                `[dtk-alea] CompendiumScanner: skipping invalid dtk.sequence item ${(item as any).id}`,
                e,
              );
            }
          }
        }
      } catch (e) {
        console.warn(
          `[dtk-alea] CompendiumScanner: failed to index pack ${pack.metadata.name}`,
          e,
        );
      }
    }

    console.log(
      `[dtk-alea] CompendiumScanner: scanned ${ritusCount} ritus, ${seqCount} sequences in ${Date.now() - start}ms`,
    );
  }
}
