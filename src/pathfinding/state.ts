import type { PathStep } from './types';

export interface PathState {
  visited: Set<number>;
  frontier: Set<number>;
  path: number[];
  /** Cell visited by the most recent step, if any. */
  current: number | null;
}

function initialState(): PathState {
  return { visited: new Set(), frontier: new Set(), path: [], current: null };
}

function apply(state: PathState, step: PathStep): void {
  switch (step.kind) {
    case 'frontier':
      if (!state.visited.has(step.cell)) state.frontier.add(step.cell);
      break;
    case 'visit':
      state.frontier.delete(step.cell);
      state.visited.add(step.cell);
      state.current = step.cell;
      break;
    case 'path':
      state.path = [...step.cells];
      state.current = null;
      break;
  }
}

export function replayPath(trace: readonly PathStep[], upTo: number): PathState {
  const state = initialState();
  const end = Math.min(upTo, trace.length);
  for (let k = 0; k < end; k++) apply(state, trace[k] as PathStep);
  return state;
}

/** Cached replay, same contract as SortReplay: cheap forward, full replay backward, returns copies. */
export class PathReplay {
  private state = initialState();
  private index = 0;

  constructor(private readonly trace: readonly PathStep[]) {}

  get length(): number {
    return this.trace.length;
  }

  at(upTo: number): PathState {
    const target = Math.max(0, Math.min(upTo, this.trace.length));
    if (target < this.index) {
      this.state = initialState();
      this.index = 0;
    }
    for (; this.index < target; this.index++) apply(this.state, this.trace[this.index] as PathStep);
    const s = this.state;
    return { visited: new Set(s.visited), frontier: new Set(s.frontier), path: [...s.path], current: s.current };
  }
}
