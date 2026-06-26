import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';
import type { RawExemplar, IExemplarSource } from '../../ports/IExemplarSource.js';

export class YamlExemplarSource implements IExemplarSource {
  constructor(private readonly dir: string) {}

  async list(): Promise<RawExemplar[]> {
    let entries: string[];
    try {
      entries = await readdir(this.dir);
    } catch {
      return [];
    }
    const yamlFiles = entries.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    const results: RawExemplar[] = [];
    for (const file of yamlFiles) {
      const filePath = join(this.dir, file);
      const content = await readFile(filePath, 'utf-8');
      results.push({ filePath, data: yaml.load(content) });
    }
    return results;
  }
}
