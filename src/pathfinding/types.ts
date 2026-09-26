import type { Grid } from './grid';

export type PathStep =
  | { kind: 'frontier'; cell: number }
  | { kind: 'visit'; cell: number }
  | { kind: 'path'; cells: number[] };

export interface PathResult {
  trace: PathStep[];
  /** Cells from start to target inclusive, or null when the target is unreachable. */
  path: number[] | null;
  /** Moves along the path (path.length - 1). */
  steps: number | null;
  /** Sum of the weights of every cell entered along the path (start excluded). */
  cost: number | null;
}

export type PathAlgorithmId = 'bfs' | 'dijkstra' | 'astar';

export interface PathAlgorithm {
  id: PathAlgorithmId;
  name: string;
  note: string;
  run(grid: Grid): PathResult;
}
