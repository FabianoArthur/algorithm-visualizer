import { describe, expect, it } from 'vitest';
import { speedFromSlider } from './speed';

describe('speedFromSlider', () => {
  it('maps 0..100 logarithmically onto 2..2000 steps per second', () => {
    expect(speedFromSlider(0)).toBe(2);
    expect(speedFromSlider(100)).toBe(2000);
    expect(speedFromSlider(50)).toBe(63);
  });

  it('is monotonic and clamps out-of-range input', () => {
    let prev = 0;
    for (let v = 0; v <= 100; v++) {
      const s = speedFromSlider(v);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
    expect(speedFromSlider(-10)).toBe(2);
    expect(speedFromSlider(500)).toBe(2000);
  });
});
