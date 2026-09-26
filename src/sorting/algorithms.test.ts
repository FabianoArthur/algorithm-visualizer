import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { SORT_ALGORITHMS, getSortAlgorithm } from './algorithms';
import { replaySort } from './state';

function cases(): number[][] {
  const rng = createRng(2026);
  const out: number[][] = [[], [5], [2, 1], [1, 2], [3, 3, 3], [1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]];
  for (let k = 0; k < 200; k++) {
    const n = rng.int(0, 60);
    const max = rng.next() < 0.3 ? 4 : 100; // some runs with many duplicates
    out.push(Array.from({ length: n }, () => rng.int(1, max)));
  }
  return out;
}

describe.each(SORT_ALGORITHMS.map((a) => [a.id, a] as const))('%s sort', (_id, algorithm) => {
  it('replaying the trace yields the sorted array for 207 inputs', () => {
    for (const input of cases()) {
      const steps = algorithm.run(input);
      const final = replaySort(input, steps, steps.length);
      expect(final.array).toEqual([...input].sort((a, b) => a - b));
    }
  });

  it('never mutates its input', () => {
    const input = [5, 3, 9, 1, 1, 7];
    const copy = [...input];
    algorithm.run(input);
    expect(input).toEqual(copy);
  });

  it('only references valid indices and ends with every bar marked sorted', () => {
    for (const input of cases()) {
      const steps = algorithm.run(input);
      // Collect first, assert once: one expect() per step is too slow for the larger inputs.
      const outOfBounds = steps.flatMap((step) => {
        const idx = step.kind === 'sorted' ? step.indices : step.kind === 'write' ? [step.i] : [step.i, step.j];
        return idx.filter((i) => !Number.isInteger(i) || i < 0 || i >= input.length);
      });
      expect(outOfBounds).toEqual([]);
      const final = replaySort(input, steps, steps.length);
      expect(final.sorted.every(Boolean)).toBe(true);
    }
  });

  it('counts at least one comparison per adjacent pair on non-trivial input', () => {
    const input = [4, 2, 7, 1, 9, 3];
    const steps = algorithm.run(input);
    const final = replaySort(input, steps, steps.length);
    expect(final.comparisons).toBeGreaterThanOrEqual(input.length - 1);
  });
});

describe('algorithm-specific behaviour', () => {
  it('bubble sort stops after one pass on sorted input (n-1 comparisons, 0 writes)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const steps = getSortAlgorithm('bubble').run(input);
    const final = replaySort(input, steps, steps.length);
    expect(final.comparisons).toBe(7);
    expect(final.writes).toBe(0);
  });

  it('insertion sort does n-1 comparisons on sorted input', () => {
    const input = [1, 2, 3, 4, 5];
    const steps = getSortAlgorithm('insertion').run(input);
    expect(replaySort(input, steps, steps.length).comparisons).toBe(4);
  });

  it('merge sort does fewer comparisons than bubble sort on reversed input', () => {
    const input = Array.from({ length: 64 }, (_, i) => 64 - i);
    const count = (id: 'merge' | 'bubble') => {
      const steps = getSortAlgorithm(id).run(input);
      return replaySort(input, steps, steps.length).comparisons;
    };
    expect(count('merge')).toBeLessThan(count('bubble'));
  });

  it('getSortAlgorithm throws for unknown ids', () => {
    expect(() => getSortAlgorithm('bogo' as never)).toThrow();
  });
});
