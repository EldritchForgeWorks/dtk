import { createHash } from 'node:crypto';

export interface CompiledEntry {
  readonly _id: string;
  readonly name: string;
  readonly type: string;
  readonly system: Record<string, unknown>;
  readonly flags: {
    readonly 'dtk-promptuarium': {
      readonly exemplarId: string;
      readonly exemplarKind: string;
      readonly compiledAt: string;
    };
  };
}

export function makeStableId(exemplarId: string): string {
  return createHash('sha1').update(exemplarId).digest('hex').slice(0, 16);
}
