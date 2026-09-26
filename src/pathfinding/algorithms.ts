import { MinHeap } from '../core/heap';
import type { Grid } from './grid';
import { MIN_WEIGHT } from './grid';
import type { PathAlgorithm, PathAlgorithmId, PathResult, PathStep } from './types';

function finish(grid: Grid, trace: PathStep[], parent: Map<number, number>, found: boolean): PathResult {
  if (!found) return { trace, path: null, steps: null, cost: null };
  const path = [grid.target];
  while (path[path.length - 1] !== grid.start) {
    path.push(parent.get(path[path.length - 1] as number) as number);
  }
  path.reverse();
  trace.push({ kind: 'path', cells: path });
  const cost = path.slice(1).reduce((sum, c) => sum + grid.weight(c), 0);
  return { trace, path, steps: path.length - 1, cost };
}

/** Breadth-first search: fewest moves, blind to weights. */
function bfs(grid: Grid): PathResult {
  const trace: PathStep[] = [];
  const parent = new Map<number, number>();
  const seen = new Set([grid.start]);
  const queue = [grid.start];
  let head = 0;
  let found = false;
  while (head < queue.length) {
    const cell = queue[head++] as number;
    trace.push({ kind: 'visit', cell });
    if (cell === grid.target) {
      found = true;
      break;
    }
    for (const n of grid.neighbors(cell)) {
      if (seen.has(n)) continue;
      seen.add(n);
      parent.set(n, cell);
      queue.push(n);
      trace.push({ kind: 'frontier', cell: n });
    }
  }
  return finish(grid, trace, parent, found);
}

/** Best-first search over g + h. With h = 0 this is Dijkstra. */
function bestFirst(grid: Grid, heuristic: (cell: number) => number): PathResult {
  const trace: PathStep[] = [];
  const parent = new Map<number, number>();
  const dist = new Map<number, number>([[grid.start, 0]]);
  const closed = new Set<number>();
  // Ties on f are broken by the smaller h, which pulls A* straight towards the target.
  const open = new MinHeap<{ cell: number; g: number; f: number; h: number }>((a, b) => a.f - b.f || a.h - b.h);
  const h0 = heuristic(grid.start);
  open.push({ cell: grid.start, g: 0, f: h0, h: h0 });
  let found = false;
  while (open.size > 0) {
    const { cell, g } = open.pop() as { cell: number; g: number };
    if (closed.has(cell) || g > (dist.get(cell) ?? Infinity)) continue; // stale heap entry
    closed.add(cell);
    trace.push({ kind: 'visit', cell });
    if (cell === grid.target) {
      found = true;
      break;
    }
    for (const n of grid.neighbors(cell)) {
      if (closed.has(n)) continue;
      const ng = g + grid.weight(n);
      if (ng < (dist.get(n) ?? Infinity)) {
        dist.set(n, ng);
        parent.set(n, cell);
        const h = heuristic(n);
        open.push({ cell: n, g: ng, f: ng + h, h });
        trace.push({ kind: 'frontier', cell: n });
      }
    }
  }
  return finish(grid, trace, parent, found);
}

function dijkstra(grid: Grid): PathResult {
  return bestFirst(grid, () => 0);
}

function astar(grid: Grid): PathResult {
  const [tr, tc] = grid.rowCol(grid.target);
  // Manhattan distance × the cheapest possible step: never overestimates, so A* stays optimal.
  return bestFirst(grid, (cell) => {
    const [r, c] = grid.rowCol(cell);
    return (Math.abs(r - tr) + Math.abs(c - tc)) * MIN_WEIGHT;
  });
}

export const PATH_ALGORITHMS: readonly PathAlgorithm[] = [
  { id: 'bfs', name: 'Breadth-first search', note: 'fewest moves, ignores weights', run: bfs },
  { id: 'dijkstra', name: 'Dijkstra', note: 'cheapest path, explores evenly', run: dijkstra },
  { id: 'astar', name: 'A*', note: 'cheapest path, guided by Manhattan distance', run: astar },
];

export function getPathAlgorithm(id: PathAlgorithmId): PathAlgorithm {
  const found = PATH_ALGORITHMS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown pathfinding algorithm: ${id}`);
  return found;
}
