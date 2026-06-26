import { describe, it, expect } from 'vitest';
import { DeterministicDiceRoller } from '../../../../src/adapters/in-memory/DeterministicDiceRoller.js';

// Boundary

describe('DeterministicDiceRoller — Boundary', () => {
  it('empty queue returns all-ones with the requested count', () => {
    const roller = new DeterministicDiceRoller();
    const result = roller.roll(3, 6);
    expect(result).toEqual([1, 1, 1]);
  });

  it('empty queue with count=1 returns [1]', () => {
    const roller = new DeterministicDiceRoller();
    expect(roller.roll(1, 6)).toEqual([1]);
  });

  it('enqueue single then roll returns that array', () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([5, 6]);
    expect(roller.roll(2, 6)).toEqual([5, 6]);
  });

  it('roll with count < queued array length truncates to count', () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([5, 6, 3, 1]);
    expect(roller.roll(2, 6)).toEqual([5, 6]);
  });

  it('roll with count > queued array length pads with ones', () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([5, 6]);
    const result = roller.roll(4, 6);
    expect(result).toEqual([5, 6, 1, 1]);
  });
});

// Scenario

describe('DeterministicDiceRoller — Scenario', () => {
  it('constructor with sequences pre-loads in order', () => {
    const roller = new DeterministicDiceRoller([[5, 6], [1, 2, 3]]);
    expect(roller.roll(2, 6)).toEqual([5, 6]);
    expect(roller.roll(3, 6)).toEqual([1, 2, 3]);
  });

  it('enqueue followed by roll dequeues FIFO', () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([3, 3]);
    roller.enqueue([5, 5]);
    expect(roller.roll(2, 6)).toEqual([3, 3]);
    expect(roller.roll(2, 6)).toEqual([5, 5]);
  });

  it('queue is consumed one entry per roll call', () => {
    const roller = new DeterministicDiceRoller([[6], [4], [2]]);
    expect(roller.roll(1, 6)).toEqual([6]);
    expect(roller.roll(1, 6)).toEqual([4]);
    expect(roller.roll(1, 6)).toEqual([2]);
  });

  it('after queue is exhausted, falls back to all-ones', () => {
    const roller = new DeterministicDiceRoller([[5, 5]]);
    roller.roll(2, 6); // consumes the only entry
    expect(roller.roll(3, 6)).toEqual([1, 1, 1]);
  });

  it('enqueue after constructor extends the queue', () => {
    const roller = new DeterministicDiceRoller([[5, 6]]);
    roller.enqueue([3, 3]);
    expect(roller.roll(2, 6)).toEqual([5, 6]);
    expect(roller.roll(2, 6)).toEqual([3, 3]);
  });
});

// Failure

describe('DeterministicDiceRoller — Failure', () => {
  it('roll with count=0 returns empty array from queue entry', () => {
    const roller = new DeterministicDiceRoller([[5, 6]]);
    expect(roller.roll(0, 6)).toEqual([]);
  });

  it('roll with count=0 on empty queue returns empty array', () => {
    const roller = new DeterministicDiceRoller();
    expect(roller.roll(0, 6)).toEqual([]);
  });

  it('sides parameter is ignored (faces come from the queue)', () => {
    const roller = new DeterministicDiceRoller([[10, 20]]);
    // sides=6 does not constrain the queued values
    const result = roller.roll(2, 6);
    expect(result).toEqual([10, 20]);
  });
});

// Combinatorial

describe('DeterministicDiceRoller — Combinatorial', () => {
  it('constructor sequences + enqueue interleave correctly in FIFO order', () => {
    const roller = new DeterministicDiceRoller([[1, 1]]);
    roller.enqueue([2, 2]);
    roller.enqueue([3, 3]);

    expect(roller.roll(2, 6)).toEqual([1, 1]);
    expect(roller.roll(2, 6)).toEqual([2, 2]);
    expect(roller.roll(2, 6)).toEqual([3, 3]);
    expect(roller.roll(2, 6)).toEqual([1, 1]); // fallback
  });

  it('mix of truncation and padding across multiple rolls', () => {
    const roller = new DeterministicDiceRoller([[5, 6, 4], [3]]);
    expect(roller.roll(2, 6)).toEqual([5, 6]); // truncated
    expect(roller.roll(3, 6)).toEqual([3, 1, 1]); // padded
    expect(roller.roll(1, 6)).toEqual([1]); // fallback all-ones
  });

  it('five sequential rolls consuming constructor sequences then fallback', () => {
    const roller = new DeterministicDiceRoller([[5], [6]]);
    expect(roller.roll(1, 6)).toEqual([5]);
    expect(roller.roll(1, 6)).toEqual([6]);
    expect(roller.roll(1, 6)).toEqual([1]);
    expect(roller.roll(1, 6)).toEqual([1]);
    expect(roller.roll(1, 6)).toEqual([1]);
  });
});
