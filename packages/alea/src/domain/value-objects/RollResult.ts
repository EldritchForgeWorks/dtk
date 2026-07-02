export interface RollResult {
  readonly hits: number;
  readonly opposedHits: number | null;
  readonly netHits: number;
  readonly tier: string;
  readonly mechanic: string;
  readonly faces: number[];
  readonly pool: number;
  readonly rolls: readonly unknown[]; // opaque platform roll objects for animation
}

export function makeRollResult(fields: RollResult): Readonly<RollResult> {
  return Object.freeze({ ...fields });
}
