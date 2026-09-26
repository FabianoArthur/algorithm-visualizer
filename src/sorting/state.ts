import type { SortStep } from './types';

export interface SortState {
  array: number[];
  sorted: boolean[];
  /** Indices touched by the most recently applied step. */
  active: number[];
  activeKind: 'compare' | 'swap' | 'write' | null;
  comparisons: number;
  /** Array writes; a swap counts as two. */
  writes: number;
}

function initialState(input: readonly number[]): SortState {
  return {
    array: [...input],
    sorted: input.map(() => false),
    active: [],
    activeKind: null,
    comparisons: 0,
    writes: 0,
  };
}

function apply(state: SortState, step: SortStep): void {
  const a = state.array;
  switch (step.kind) {
    case 'compare':
      state.comparisons += 1;
      state.active = [step.i, step.j];
      state.activeKind = 'compare';
      break;
    case 'swap': {
      const tmp = a[step.i] as number;
      a[step.i] = a[step.j] as number;
      a[step.j] = tmp;
      state.writes += 2;
      state.active = [step.i, step.j];
      state.activeKind = 'swap';
      break;
    }
    case 'write':
      a[step.i] = step.value;
      state.writes += 1;
      state.active = [step.i];
      state.activeKind = 'write';
      break;
    case 'sorted':
      for (const i of step.indices) state.sorted[i] = true;
      state.active = [];
      state.activeKind = null;
      break;
  }
}

/** State after applying the first `upTo` steps (clamped to the trace length). */
export function replaySort(input: readonly number[], steps: readonly SortStep[], upTo: number): SortState {
  const state = initialState(input);
  const end = Math.min(upTo, steps.length);
  for (let k = 0; k < end; k++) apply(state, steps[k] as SortStep);
  return state;
}

function clone(s: SortState): SortState {
  return { ...s, array: [...s.array], sorted: [...s.sorted], active: [...s.active] };
}

/**
 * Cached replay: moving forward applies only the new steps; moving backward replays from the start.
 * `at` returns a copy, so callers can't corrupt the cache.
 */
export class SortReplay {
  private state: SortState;
  private index = 0;

  constructor(
    private readonly input: readonly number[],
    private readonly steps: readonly SortStep[],
  ) {
    this.state = initialState(input);
  }

  get length(): number {
    return this.steps.length;
  }

  at(upTo: number): SortState {
    const target = Math.max(0, Math.min(upTo, this.steps.length));
    if (target < this.index) {
      this.state = initialState(this.input);
      this.index = 0;
    }
    for (; this.index < target; this.index++) apply(this.state, this.steps[this.index] as SortStep);
    return clone(this.state);
  }
}
