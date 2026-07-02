import { describe, it, expect } from 'vitest';
import { DeterministicDiceRoller } from '../../../../src/adapters/in-memory/DeterministicDiceRoller.js';

// Boundary

describe('DeterministicDiceRoller — Boundary', () => {
  it('empty queue returns all-ones with the requested count', async () => {
    const roller = new DeterministicDiceRoller();
    const { faces } = await roller.roll(3, 6);
    expect(faces).toEqual([1, 1, 1]);
  });

  it('empty queue with count=1 returns [1]', async () => {
    const roller = new DeterministicDiceRoller();
    const { faces } = await roller.roll(1, 6);
    expect(faces).toEqual([1]);
  });

  it('enqueue single then roll returns that array', async () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([5, 6]);
    const { faces } = await roller.roll(2, 6);
    expect(faces).toEqual([5, 6]);
  });

  it('roll with count < queued array length truncates to count', async () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([5, 6, 3, 1]);
    const { faces } = await roller.roll(2, 6);
    expect(faces).toEqual([5, 6]);
  });

  it('roll with count > queued array length pads with ones', async () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([5, 6]);
    const { faces } = await roller.roll(4, 6);
    expect(faces).toEqual([5, 6, 1, 1]);
  });
});

// Scenario

describe('DeterministicDiceRoller — Scenario', () => {
  it('constructor with sequences pre-loads in order', async () => {
    const roller = new DeterministicDiceRoller([[5, 6], [1, 2, 3]]);
    expect((await roller.roll(2, 6)).faces).toEqual([5, 6]);
    expect((await roller.roll(3, 6)).faces).toEqual([1, 2, 3]);
  });

  it('enqueue followed by roll dequeues FIFO', async () => {
    const roller = new DeterministicDiceRoller();
    roller.enqueue([3, 3]);
    roller.enqueue([5, 5]);
    expect((await roller.roll(2, 6)).faces).toEqual([3, 3]);
    expect((await roller.roll(2, 6)).faces).toEqual([5, 5]);
  });

  it('queue is consumed one entry per roll call', async () => {
    const roller = new DeterministicDiceRoller([[6], [4], [2]]);
    expect((await roller.roll(1, 6)).faces).toEqual([6]);
    expect((await roller.roll(1, 6)).faces).toEqual([4]);
    expect((await roller.roll(1, 6)).faces).toEqual([2]);
  });

  it('after queue is exhausted, falls back to all-ones', async () => {
    const roller = new DeterministicDiceRoller([[5, 5]]);
    await roller.roll(2, 6); // consumes the only entry
    const { faces } = await roller.roll(3, 6);
    expect(faces).toEqual([1, 1, 1]);
  });

  it('enqueue after constructor extends the queue', async () => {
    const roller = new DeterministicDiceRoller([[5, 6]]);
    roller.enqueue([3, 3]);
    expect((await roller.roll(2, 6)).faces).toEqual([5, 6]);
    expect((await roller.roll(2, 6)).faces).toEqual([3, 3]);
  });

  it('raw field is null for in-memory roller', async () => {
    const roller = new DeterministicDiceRoller([[4, 5]]);
    const result = await roller.roll(2, 6);
    expect(result.raw).toBeNull();
  });
});

// Failure

describe('DeterministicDiceRoller — Failure', () => {
  it('roll with count=0 returns empty array from queue entry', async () => {
    const roller = new DeterministicDiceRoller([[5, 6]]);
    const { faces } = await roller.roll(0, 6);
    expect(faces).toEqual([]);
  });

  it('roll with count=0 on empty queue returns empty array', async () => {
    const roller = new DeterministicDiceRoller();
    const { faces } = await roller.roll(0, 6);
    expect(faces).toEqual([]);
  });

  it('sides parameter is ignored (faces come from the queue)', async () => {
    const roller = new DeterministicDiceRoller([[10, 20]]);
    const { faces } = await roller.roll(2, 6);
    expect(faces).toEqual([10, 20]);
  });
});

// Combinatorial

describe('DeterministicDiceRoller — Combinatorial', () => {
  it('constructor sequences + enqueue interleave correctly in FIFO order', async () => {
    const roller = new DeterministicDiceRoller([[1, 1]]);
    roller.enqueue([2, 2]);
    roller.enqueue([3, 3]);

    expect((await roller.roll(2, 6)).faces).toEqual([1, 1]);
    expect((await roller.roll(2, 6)).faces).toEqual([2, 2]);
    expect((await roller.roll(2, 6)).faces).toEqual([3, 3]);
    expect((await roller.roll(2, 6)).faces).toEqual([1, 1]); // fallback
  });

  it('mix of truncation and padding across multiple rolls', async () => {
    const roller = new DeterministicDiceRoller([[5, 6, 4], [3]]);
    expect((await roller.roll(2, 6)).faces).toEqual([5, 6]); // truncated
    expect((await roller.roll(3, 6)).faces).toEqual([3, 1, 1]); // padded
    expect((await roller.roll(1, 6)).faces).toEqual([1]); // fallback all-ones
  });

  it('five sequential rolls consuming constructor sequences then fallback', async () => {
    const roller = new DeterministicDiceRoller([[5], [6]]);
    expect((await roller.roll(1, 6)).faces).toEqual([5]);
    expect((await roller.roll(1, 6)).faces).toEqual([6]);
    expect((await roller.roll(1, 6)).faces).toEqual([1]);
    expect((await roller.roll(1, 6)).faces).toEqual([1]);
    expect((await roller.roll(1, 6)).faces).toEqual([1]);
  });
});
