import type { IDiceRoller, DiceResult } from '../../ports/IDiceRoller.js';

export class DeterministicDiceRoller implements IDiceRoller {
  private readonly _queue: number[][];

  constructor(sequences?: number[][]) {
    this._queue = sequences ? [...sequences] : [];
  }

  enqueue(faces: number[]): void {
    this._queue.push(faces);
  }

  async roll(count: number, _sides: number): Promise<DiceResult> {
    let faces: number[];
    if (this._queue.length === 0) {
      faces = Array(count).fill(1);
    } else {
      const queued = this._queue.shift()!;
      faces = queued.length >= count
        ? queued.slice(0, count)
        : [...queued, ...Array(count - queued.length).fill(1)];
    }
    return { faces, raw: null };
  }
}
