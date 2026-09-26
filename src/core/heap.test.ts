import { describe, expect, it } from 'vitest';
import { MinHeap } from './heap';
import { createRng } from './rng';

describe('MinHeap', () => {
  it('pops items in ascending order', () => {
    const rng = createRng(11);
    const heap = new MinHeap<number>((a, b) => a - b);
    const values = Array.from({ length: 500 }, () => rng.int(-1000, 1000));
    values.forEach((v) => {
      heap.push(v);
    });
    expect(heap.size).toBe(500);
    const out: number[] = [];
    while (heap.size > 0) out.push(heap.pop() as number);
    expect(out).toEqual([...values].sort((a, b) => a - b));
  });

  it('returns undefined when empty and peek does not remove', () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    expect(heap.pop()).toBeUndefined();
    expect(heap.peek()).toBeUndefined();
    heap.push(3);
    expect(heap.peek()).toBe(3);
    expect(heap.size).toBe(1);
  });

  it('breaks ties by insertion order (stable)', () => {
    const heap = new MinHeap<{ key: number; id: string }>((a, b) => a.key - b.key);
    ['a', 'b', 'c', 'd'].forEach((id) => {
      heap.push({ key: 1, id });
    });
    heap.push({ key: 0, id: 'z' });
    const ids: string[] = [];
    while (heap.size > 0) ids.push((heap.pop() as { id: string }).id);
    expect(ids).toEqual(['z', 'a', 'b', 'c', 'd']);
  });
});
