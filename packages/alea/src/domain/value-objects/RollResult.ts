export interface RollResult {
  readonly hits: number;
  readonly opposedHits: number | null;
  readonly netHits: number;
  readonly tier: string;
  readonly faces: number[];
  readonly pool: number;
}

export function makeRollResult(fields: RollResult): Readonly<RollResult> {
  return Object.freeze({ ...fields });
}
