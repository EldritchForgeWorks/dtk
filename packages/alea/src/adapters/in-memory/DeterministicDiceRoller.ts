import type { IDiceRoller } from '../../ports/IDiceRoller.js';

export class DeterministicDiceRoller implements IDiceRoller {
  private readonly _queue: number[][];

  constructor(sequences?: number[][]) {
    this._queue = sequences ? [...sequences] : [];
  }

  enqueue(faces: number[]): void {
    this._queue.push(faces);
  }

  roll(count: number, _sides: number): number[] {
    if (this._queue.length === 0) {
      return Array(count).fill(1);
    }
    const faces = this._queue.shift()!;
    if (faces.length >= count) return faces.slice(0, count);
    return [...faces, ...Array(count - faces.length).fill(1)];
  }
}
