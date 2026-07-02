import type { SequenceExemplar } from '../entities/SequenceExecution.js';

export class SequenceExemplarRegistry {
  private readonly store = new Map<string, SequenceExemplar>();

  register(uuid: string, exemplar: SequenceExemplar): void {
    if (this.store.has(uuid)) {
      console.warn(`SequenceExemplarRegistry: duplicate UUID "${uuid}" — overwriting.`);
    }
    this.store.set(uuid, exemplar);
  }

  getByUUID(uuid: string): SequenceExemplar | null {
    return this.store.get(uuid) ?? null;
  }

  getBySystemId(systemId: string): SequenceExemplar | null {
    for (const [, exemplar] of this.store) {
      if (exemplar.id === systemId) return exemplar;
    }
    return null;
  }

  all(): ReadonlyMap<string, SequenceExemplar> {
    return this.store;
  }
}
