export interface DiceResult {
  faces: number[];
  raw: unknown; // opaque platform roll object (e.g. Foundry Roll), null in tests
}

export interface RollOpts {
  explodes?: boolean;
  keepMode?: 'highest' | 'lowest';
}

export interface IDiceRoller {
  roll(count: number, sides: number, opts?: RollOpts): Promise<DiceResult>;
}
