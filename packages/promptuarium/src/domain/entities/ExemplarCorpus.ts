import type { Exemplar, ExemplarKind } from '@eldritchforgeworks/dtk-types/exemplar';

export class ExemplarCorpus {
  private readonly store = new Map<string, Exemplar>();

  add(exemplar: Exemplar): void {
    if (this.store.has(exemplar.id)) {
      throw new Error(`Duplicate Exemplar id: "${exemplar.id}"`);
    }
    this.store.set(exemplar.id, exemplar);
  }

  get(id: string): Exemplar | undefined {
    return this.store.get(id);
  }

  has(id: string): boolean {
    return this.store.has(id);
  }

  entries(): readonly Exemplar[] {
    return Array.from(this.store.values());
  }

  ids(): ReadonlySet<string> {
    return new Set(this.store.keys());
  }

  slugs(): ReadonlySet<string> {
    return new Set(Array.from(this.store.values()).map(e => e.slug));
  }

  size(): number {
    return this.store.size;
  }

  byKind(kind: ExemplarKind): readonly Exemplar[] {
    return Array.from(this.store.values()).filter(e => e.kind === kind);
  }
}
