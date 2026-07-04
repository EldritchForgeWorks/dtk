import type { Exemplar } from '@eldritchforgeworks/dtk-types/exemplar';
import type { ICompendiumTarget, PackDocumentClass } from '../../ports/ICompendiumTarget.js';
import type { ExemplarCorpus } from '../entities/ExemplarCorpus.js';
import { type CompiledEntry, makeStableId } from '../value-objects/CompiledEntry.js';

export interface ModusOutputMapper {
  readonly packId: string;
  readonly documentType: string;
  readonly kinds: readonly string[];
  readonly fieldMap: Readonly<Record<string, string>>;
  /** Foundry collection the pack writes under. Defaults to `'Item'` — every
   *  exemplar kind compiled today is an Item subtype. */
  readonly documentClass?: PackDocumentClass;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] == null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export class ExemplarCompiler {
  constructor(private readonly target: ICompendiumTarget) {}

  toCompiledEntry(
    exemplar: Exemplar,
    mapper: ModusOutputMapper,
    compiledAt: string,
  ): CompiledEntry {
    const system: Record<string, unknown> = {};
    const raw = exemplar as unknown as Record<string, unknown>;

    for (const [fromPath, toPath] of Object.entries(mapper.fieldMap)) {
      const value = getByPath(raw, fromPath);
      if (value !== undefined) {
        setByPath(system, toPath, value);
      }
    }

    return {
      _id: makeStableId(exemplar.id),
      name: exemplar.name,
      type: mapper.documentType,
      system,
      flags: {
        'dtk-promptuarium': {
          exemplarId: exemplar.id,
          exemplarKind: exemplar.kind,
          compiledAt,
        },
      },
    };
  }

  async compile(
    corpus: ExemplarCorpus,
    mappers: readonly ModusOutputMapper[],
    compiledAt: string,
  ): Promise<void> {
    // Compute all entries before any writes (no partial writes)
    const packEntries = new Map<string, { entries: CompiledEntry[]; documentClass: PackDocumentClass }>();

    for (const mapper of mappers) {
      const entries: CompiledEntry[] = [];
      for (const exemplar of corpus.entries()) {
        if (mapper.kinds.includes(exemplar.kind)) {
          entries.push(this.toCompiledEntry(exemplar, mapper, compiledAt));
        }
      }
      packEntries.set(mapper.packId, { entries, documentClass: mapper.documentClass ?? 'Item' });
    }

    for (const [packId, { entries, documentClass }] of packEntries) {
      await this.target.write(packId, entries, documentClass);
    }
  }
}
