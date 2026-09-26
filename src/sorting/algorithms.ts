import type { SortAlgorithm, SortAlgorithmId, SortStep } from './types';

/** Works on a private copy of the input and records every operation as a step. */
class Tracer {
  readonly a: number[];
  readonly steps: SortStep[] = [];

  constructor(input: readonly number[]) {
    this.a = [...input];
  }

  get(i: number): number {
    return this.a[i] as number;
  }

  /** Records a comparison and returns a[i] > a[j]. */
  greater(i: number, j: number): boolean {
    this.steps.push({ kind: 'compare', i, j });
    return this.get(i) > this.get(j);
  }

  swap(i: number, j: number): void {
    if (i === j) return;
    const tmp = this.get(i);
    this.a[i] = this.get(j);
    this.a[j] = tmp;
    this.steps.push({ kind: 'swap', i, j });
  }

  write(i: number, value: number): void {
    this.a[i] = value;
    this.steps.push({ kind: 'write', i, value });
  }

  sorted(...indices: number[]): void {
    if (indices.length > 0) this.steps.push({ kind: 'sorted', indices });
  }

  /** Marks every index sorted; used where the algorithm only knows at the very end. */
  allSorted(): SortStep[] {
    this.sorted(...this.a.map((_, i) => i));
    return this.steps;
  }
}

function bubble(input: readonly number[]): SortStep[] {
  const t = new Tracer(input);
  const n = t.a.length;
  for (let end = n - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      if (t.greater(i, i + 1)) {
        t.swap(i, i + 1);
        swapped = true;
      }
    }
    t.sorted(end);
    if (!swapped) break;
  }
  return t.allSorted();
}

function insertion(input: readonly number[]): SortStep[] {
  const t = new Tracer(input);
  for (let i = 1; i < t.a.length; i++) {
    for (let j = i; j > 0 && t.greater(j - 1, j); j--) t.swap(j - 1, j);
  }
  return t.allSorted();
}

function merge(input: readonly number[]): SortStep[] {
  const t = new Tracer(input);
  const sortRange = (lo: number, hi: number): void => {
    if (hi - lo < 1) return;
    const mid = (lo + hi) >> 1;
    sortRange(lo, mid);
    sortRange(mid + 1, hi);
    const left = t.a.slice(lo, mid + 1);
    const right = t.a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      // Highlight where the two candidates came from; values are read from the saved halves.
      t.steps.push({ kind: 'compare', i: lo + i, j: mid + 1 + j });
      const l = left[i] as number;
      const r = right[j] as number;
      if (l <= r) {
        t.write(k++, l);
        i++;
      } else {
        t.write(k++, r);
        j++;
      }
    }
    while (i < left.length) t.write(k++, left[i++] as number);
    while (j < right.length) t.write(k++, right[j++] as number);
  };
  sortRange(0, t.a.length - 1);
  return t.allSorted();
}

function quick(input: readonly number[]): SortStep[] {
  const t = new Tracer(input);
  // Explicit stack instead of recursion: already-sorted input is quicksort's worst case.
  const stack: [number, number][] = [[0, t.a.length - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop() as [number, number];
    if (lo > hi) continue;
    if (lo === hi) {
      t.sorted(lo);
      continue;
    }
    // Lomuto partition, pivot = last element.
    let store = lo;
    for (let j = lo; j < hi; j++) {
      if (!t.greater(j, hi)) {
        t.swap(store, j);
        store++;
      }
    }
    t.swap(store, hi);
    t.sorted(store);
    stack.push([store + 1, hi], [lo, store - 1]);
  }
  return t.allSorted();
}

function heap(input: readonly number[]): SortStep[] {
  const t = new Tracer(input);
  const n = t.a.length;
  const siftDown = (start: number, end: number): void => {
    let root = start;
    for (;;) {
      const left = 2 * root + 1;
      if (left > end) return;
      let largest = root;
      if (t.greater(left, largest)) largest = left;
      const right = left + 1;
      if (right <= end && t.greater(right, largest)) largest = right;
      if (largest === root) return;
      t.swap(root, largest);
      root = largest;
    }
  };
  for (let start = (n >> 1) - 1; start >= 0; start--) siftDown(start, n - 1);
  for (let end = n - 1; end > 0; end--) {
    t.swap(0, end);
    t.sorted(end);
    siftDown(0, end - 1);
  }
  return t.allSorted();
}

export const SORT_ALGORITHMS: readonly SortAlgorithm[] = [
  { id: 'bubble', name: 'Bubble sort', complexity: 'O(n²)', run: bubble },
  { id: 'insertion', name: 'Insertion sort', complexity: 'O(n²)', run: insertion },
  { id: 'merge', name: 'Merge sort', complexity: 'O(n log n)', run: merge },
  { id: 'quick', name: 'Quicksort', complexity: 'O(n log n) avg', run: quick },
  { id: 'heap', name: 'Heapsort', complexity: 'O(n log n)', run: heap },
];

export function getSortAlgorithm(id: SortAlgorithmId): SortAlgorithm {
  const found = SORT_ALGORITHMS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown sorting algorithm: ${id}`);
  return found;
}
