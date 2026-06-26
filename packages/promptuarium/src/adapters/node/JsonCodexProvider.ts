import { readFile } from 'node:fs/promises';
import type { ICodexProvider } from '../../ports/ICodexProvider.js';

export class JsonCodexProvider implements ICodexProvider {
  private slugMap: Record<string, string> = {};

  constructor(private readonly codexFilePath: string) {}

  async load(): Promise<void> {
    const content = await readFile(this.codexFilePath, 'utf-8');
    this.slugMap = JSON.parse(content) as Record<string, string>;
  }

  resolveSlug(slug: string): string {
    return this.slugMap[slug] ?? slug;
  }
}
