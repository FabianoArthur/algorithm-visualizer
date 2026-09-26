import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { Grid } from './grid';

describe('Grid', () => {
  it('maps between (row, col) and cell index', () => {
    const g = new Grid(4, 6);
    expect(g.cell(2, 3)).toBe(15);
    expect(g.rowCol(15)).toEqual([2, 3]);
    expect(g.size).toBe(24);
  });

  it('places start and target on the middle row by default', () => {
    const g = new Grid(5, 10);
    expect(g.rowCol(g.start)).toEqual([2, 1]);
    expect(g.rowCol(g.target)).toEqual([2, 8]);
  });

  it('toggles walls but never on start or target', () => {
    const g = new Grid(3, 3);
    expect(g.setWall(4, true)).toBe(true);
    expect(g.isWall(4)).toBe(true);
    expect(g.setWall(g.start, true)).toBe(false);
    expect(g.setWall(g.target, true)).toBe(false);
    expect(g.isWall(g.start)).toBe(false);
    g.setWall(4, false);
    expect(g.isWall(4)).toBe(false);
  });

  it('weights are integers in [1, 9]; walls and weights are mutually exclusive', () => {
    const g = new Grid(3, 3);
    expect(g.weight(4)).toBe(1);
    g.setWeight(4, 5);
    expect(g.weight(4)).toBe(5);
    expect(() => {
      g.setWeight(4, 0);
    }).toThrow(RangeError);
    expect(() => {
      g.setWeight(4, 10);
    }).toThrow(RangeError);
    expect(() => {
      g.setWeight(4, 2.5);
    }).toThrow(RangeError);
    g.setWall(4, true);
    expect(g.weight(4)).toBe(1);
    g.setWeight(4, 3);
    expect(g.isWall(4)).toBe(false);
  });

  it('moves endpoints, clearing walls, but not onto each other', () => {
    const g = new Grid(3, 5);
    g.setWall(7, true);
    expect(g.moveEndpoint('start', 7)).toBe(true);
    expect(g.start).toBe(7);
    expect(g.isWall(7)).toBe(false);
    expect(g.moveEndpoint('start', g.target)).toBe(false);
    expect(g.moveEndpoint('target', 99)).toBe(false);
  });

  it('neighbors are 4-way, in bounds and skip walls', () => {
    const g = new Grid(3, 3);
    expect(g.neighbors(0).sort()).toEqual([1, 3]);
    expect(g.neighbors(4).sort()).toEqual([1, 3, 5, 7]);
    g.setWall(1, true);
    expect(g.neighbors(4).sort()).toEqual([3, 5, 7]);
    // no wrap-around between rows
    expect(g.neighbors(2)).not.toContain(3);
  });

  it('randomize keeps endpoints free and is deterministic per seed', () => {
    const a = new Grid(15, 30);
    const b = new Grid(15, 30);
    a.randomize(createRng(4), { wallDensity: 0.3, weightDensity: 0.2 });
    b.randomize(createRng(4), { wallDensity: 0.3, weightDensity: 0.2 });
    expect([...a.walls].sort()).toEqual([...b.walls].sort());
    expect(a.isWall(a.start) || a.isWall(a.target)).toBe(false);
    expect(a.walls.size).toBeGreaterThan(80);
    expect(a.walls.size).toBeLessThan(190);
    for (const w of a.weights.values()) expect(w).toBeGreaterThanOrEqual(2);
  });

  it('randomize can use one fixed weight for every heavy cell', () => {
    const g = new Grid(15, 30);
    g.randomize(createRng(9), { wallDensity: 0.2, weightDensity: 0.3, weight: 5 });
    expect(g.weights.size).toBeGreaterThan(0);
    expect(new Set(g.weights.values())).toEqual(new Set([5]));
  });

  it('clone is independent', () => {
    const g = new Grid(3, 3);
    const c = g.clone();
    c.setWall(4, true);
    expect(g.isWall(4)).toBe(false);
  });

  it('clear removes walls and weights', () => {
    const g = new Grid(3, 3);
    g.setWall(4, true);
    g.setWeight(5, 4);
    g.clear();
    expect(g.walls.size + g.weights.size).toBe(0);
  });
});
