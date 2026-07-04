import { createHash } from 'node:crypto';

export interface CompiledEntry {
  readonly _id: string;
  readonly name: string;
  readonly type: string;
  readonly system: Record<string, unknown>;
  readonly flags: {
    // Optional: sequence-sourced entries (cli/commands/compile.ts) ship the
    // fixed `dtk.sequence` envelope with empty flags, matching
    // dtk-shadowrun's shipped `sr-sequences` pack exactly — they aren't
    // compiled from an Exemplar, so there's no exemplar metadata to attach.
    readonly 'dtk-promptuarium'?: {
      readonly exemplarId: string;
      readonly exemplarKind: string;
      readonly compiledAt: string;
    };
  };
}

export function makeStableId(exemplarId: string): string {
  return createHash('sha1').update(exemplarId).digest('hex').slice(0, 16);
}
