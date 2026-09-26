import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { SORT_ALGORITHMS } from './algorithms';
import { SortReplay, replaySort } from './state';
import type { SortStep } from './types';

describe('replaySort', () => {
  it('upTo = 0 returns the untouched input', () => {
    const input = [3, 1, 2];
    const steps: SortStep[] = [{ kind: 'swap', i: 0, j: 1 }];
    const s = replaySort(input, steps, 0);
    expect(s.array).toEqual([3, 1, 2]);
    expect(s.active).toEqual([]);
    expect(s.comparisons).toBe(0);
  });

  it('applies compare / swap / write / sorted and tracks counters and highlights', () => {
    const input = [3, 1, 2];
    const steps: SortStep[] = [
      { kind: 'compare', i: 0, j: 1 },
      { kind: 'swap', i: 0, j: 1 },
      { kind: 'write', i: 2, value: 9 },
      { kind: 'sorted', indices: [0] },
    ];
    expect(replaySort(input, steps, 1)).toMatchObject({ active: [0, 1], activeKind: 'compare', comparisons: 1 });
    const s = replaySort(input, steps, 4);
    expect(s.array).toEqual([1, 3, 9]);
    expect(s.writes).toBe(3); // a swap is two writes
    expect(s.sorted).toEqual([true, false, false]);
  });

  it('clamps upTo to the trace length', () => {
    const s = replaySort([2, 1], [{ kind: 'swap', i: 0, j: 1 }], 50);
    expect(s.array).toEqual([1, 2]);
  });
});

describe('SortReplay', () => {
  it('incremental forward stepping and seeking back match a full replay at every index', () => {
    const rng = createRng(99);
    const input = Array.from({ length: 30 }, () => rng.int(1, 50));
    for (const algorithm of SORT_ALGORITHMS) {
      const steps = algorithm.run(input);
      const replay = new SortReplay(input, steps);
      for (let i = 0; i <= steps.length; i += 1) {
        expect(replay.at(i)).toEqual(replaySort(input, steps, i));
      }
      // jump backwards and forwards at random
      for (let k = 0; k < 50; k++) {
        const i = rng.int(0, steps.length);
        expect(replay.at(i)).toEqual(replaySort(input, steps, i));
      }
    }
  });
});
