// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const game: any;

import type { CodexRegistry } from '../../domain/CodexRegistry.js';

export class CompendiumScanner {
  constructor(private readonly registry: CodexRegistry) {}

  async scanAll(): Promise<void> {
    const start = Date.now();
    const byModule = new Map<
      string,
      Array<{
        slug: string;
        displayName: string;
        description?: string | undefined;
        category?: string | undefined;
      }>
    >();

    for (const pack of game.packs) {
      if (pack.metadata.packageType !== 'module') continue;
      const moduleId: string = pack.metadata.packageName ?? pack.metadata.package ?? 'unknown';

      try {
        await pack.getIndex();
        const items = await pack.getDocuments({ type: 'dtk.codex-entry' });
        for (const item of items) {
          try {
            const entry = {
              slug: item.system.slug as string,
              displayName: item.name as string,
              description: item.system.description as string | undefined,
              category: item.system.category as string | undefined,
            };
            if (!byModule.has(moduleId)) byModule.set(moduleId, []);
            byModule.get(moduleId)!.push(entry);
          } catch (e) {
            console.warn(
              `[dtk-lex] CompendiumScanner: skipping invalid dtk.codex-entry item ${item.id}`,
              e,
            );
          }
        }
      } catch (e) {
        console.warn(
          `[dtk-lex] CompendiumScanner: failed to index pack ${pack.metadata.name}`,
          e,
        );
      }
    }

    let total = 0;
    for (const [moduleId, entries] of byModule) {
      this.registry.register(moduleId, entries as any);
      total += entries.length;
    }
    console.log(
      `[dtk-lex] CompendiumScanner: registered ${total} codex entries in ${Date.now() - start}ms`,
    );
  }
}
