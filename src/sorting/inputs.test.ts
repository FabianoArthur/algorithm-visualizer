import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { INPUT_PRESETS, makeInput } from './inputs';

describe('makeInput', () => {
  it.each(INPUT_PRESETS.map((p) => p.id))('%s produces n values in [1, 100]', (id) => {
    const values = makeInput(id, 40, createRng(5));
    expect(values).toHaveLength(40);
    for (const v of values) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('reversed is strictly non-increasing, nearly-sorted is mostly ordered', () => {
    const rev = makeInput('reversed', 50, createRng(1));
    expect(rev.every((v, i) => i === 0 || v <= (rev[i - 1] as number))).toBe(true);
    const nearly = makeInput('nearly-sorted', 50, createRng(1));
    const inversions = nearly.filter((v, i) => i > 0 && v < (nearly[i - 1] as number)).length;
    expect(inversions).toBeLessThan(10);
  });

  it('few-unique uses at most 5 distinct values', () => {
    expect(new Set(makeInput('few-unique', 80, createRng(2))).size).toBeLessThanOrEqual(5);
  });

  it('is deterministic for the same seed', () => {
    expect(makeInput('random', 20, createRng(8))).toEqual(makeInput('random', 20, createRng(8)));
  });
});
