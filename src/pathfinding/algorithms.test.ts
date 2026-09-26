import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { PATH_ALGORITHMS, getPathAlgorithm } from './algorithms';
import { Grid } from './grid';
import { PathReplay, replayPath } from './state';

/** Reference shortest distances by repeated relaxation (Bellman-Ford style), independent of the heap code. */
function referenceCost(g: Grid): number | null {
  const dist = new Array<number>(g.size).fill(Infinity);
  dist[g.start] = 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (let c = 0; c < g.size; c++) {
      const d = dist[c] as number;
      if (d === Infinity || g.isWall(c)) continue;
      for (const n of g.neighbors(c)) {
        const nd = d + g.weight(n);
        if (nd < (dist[n] as number)) {
          dist[n] = nd;
          changed = true;
        }
      }
    }
  }
  const t = dist[g.target] as number;
  return t === Infinity ? null : t;
}

/** Reference BFS step count (ignores weights). */
function referenceSteps(g: Grid): number | null {
  const depth = new Map<number, number>([[g.start, 0]]);
  const queue = [g.start];
  while (queue.length > 0) {
    const c = queue.shift() as number;
    for (const n of g.neighbors(c)) {
      if (!depth.has(n)) {
        depth.set(n, (depth.get(c) as number) + 1);
        queue.push(n);
      }
    }
  }
  return depth.get(g.target) ?? null;
}

function randomGrids(count: number, weighted: boolean): Grid[] {
  const rng = createRng(123);
  return Array.from({ length: count }, () => {
    const g = new Grid(rng.int(3, 14), rng.int(3, 18));
    g.randomize(rng, { wallDensity: rng.next() * 0.4, weightDensity: weighted ? 0.35 : 0 });
    return g;
  });
}

function assertValidPath(g: Grid, path: number[]): void {
  expect(path[0]).toBe(g.start);
  expect(path[path.length - 1]).toBe(g.target);
  for (let k = 1; k < path.length; k++) {
    expect(g.neighbors(path[k - 1] as number)).toContain(path[k]);
  }
}

describe.each(PATH_ALGORITHMS.map((a) => [a.id, a] as const))('%s', (_id, algorithm) => {
  it('finds a valid path whenever one exists, and reports null otherwise (200 grids)', () => {
    for (const g of randomGrids(200, true)) {
      const result = algorithm.run(g);
      const reachable = referenceCost(g) !== null;
      expect(result.path !== null).toBe(reachable);
      if (result.path) {
        assertValidPath(g, result.path);
        expect(result.steps).toBe(result.path.length - 1);
        expect(result.cost).toBe(result.path.slice(1).reduce((s, c) => s + g.weight(c), 0));
      }
    }
  });

  it('handles start == target neighbours and a fully walled target', () => {
    const g = new Grid(1, 2);
    const r = algorithm.run(g);
    expect(r.path).toEqual([0, 1]);
    const blocked = new Grid(3, 3);
    blocked.moveEndpoint('start', 0);
    blocked.moveEndpoint('target', 8);
    blocked.setWall(5, true);
    blocked.setWall(7, true);
    expect(algorithm.run(blocked).path).toBeNull();
  });

  it('emits a trace whose last step is the path when found', () => {
    const g = new Grid(5, 8);
    const r = algorithm.run(g);
    const last = r.trace[r.trace.length - 1];
    expect(last).toEqual({ kind: 'path', cells: r.path });
    const final = replayPath(r.trace, r.trace.length);
    expect(final.path).toEqual(r.path);
    expect(final.visited.has(g.target)).toBe(true);
  });
});

describe('optimality', () => {
  it('BFS finds the minimum number of steps (unweighted grids)', () => {
    for (const g of randomGrids(200, false)) {
      expect(getPathAlgorithm('bfs').run(g).path?.length ?? null).toBe(
        referenceSteps(g) === null ? null : (referenceSteps(g) as number) + 1,
      );
    }
  });

  it('Dijkstra and A* both find the minimum weighted cost (200 weighted grids)', () => {
    for (const g of randomGrids(200, true)) {
      const expected = referenceCost(g);
      expect(getPathAlgorithm('dijkstra').run(g).cost).toBe(expected);
      expect(getPathAlgorithm('astar').run(g).cost).toBe(expected);
    }
  });

  it('A* visits no more cells than Dijkstra on an open grid', () => {
    const g = new Grid(21, 41);
    const visits = (id: 'astar' | 'dijkstra') => replayPath(getPathAlgorithm(id).run(g).trace, Infinity).visited.size;
    expect(visits('astar')).toBeLessThan(visits('dijkstra'));
  });

  it('BFS can pick a costlier path than Dijkstra when weights matter', () => {
    const g = new Grid(3, 5);
    g.moveEndpoint('start', g.cell(1, 0));
    g.moveEndpoint('target', g.cell(1, 4));
    for (let c = 1; c <= 3; c++) g.setWeight(g.cell(1, c), 9);
    expect(getPathAlgorithm('bfs').run(g).cost).toBeGreaterThan(getPathAlgorithm('dijkstra').run(g).cost as number);
  });
});

describe('PathReplay', () => {
  it('matches a full replay at every index, forwards and backwards', () => {
    const [g] = randomGrids(1, true) as [Grid];
    const r = getPathAlgorithm('astar').run(g);
    const replay = new PathReplay(r.trace);
    const rng = createRng(5);
    for (let k = 0; k < 150; k++) {
      const i = k < 50 ? k : rng.int(0, r.trace.length);
      expect(replay.at(i)).toEqual(replayPath(r.trace, i));
    }
  });

  it('a visited cell leaves the frontier', () => {
    const s = replayPath(
      [
        { kind: 'frontier', cell: 3 },
        { kind: 'visit', cell: 3 },
      ],
      2,
    );
    expect(s.frontier.has(3)).toBe(false);
    expect(s.visited.has(3)).toBe(true);
    expect(s.current).toBe(3);
  });
});
