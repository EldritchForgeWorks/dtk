import type { ICodexProvider } from '../../ports/ICodexProvider.js';

export class StubCodexProvider implements ICodexProvider {
  constructor(private readonly overrides: Readonly<Record<string, string>> = {}) {}

  resolveSlug(slug: string): string {
    return this.overrides[slug] ?? slug;
  }
}
