export type SortStep =
  | { kind: 'compare'; i: number; j: number }
  | { kind: 'swap'; i: number; j: number }
  | { kind: 'write'; i: number; value: number }
  | { kind: 'sorted'; indices: number[] };

export type SortAlgorithmId = 'bubble' | 'insertion' | 'merge' | 'quick' | 'heap';

export interface SortAlgorithm {
  id: SortAlgorithmId;
  name: string;
  complexity: string;
  /** Returns the full trace. Never mutates `input`. */
  run(input: readonly number[]): SortStep[];
}
