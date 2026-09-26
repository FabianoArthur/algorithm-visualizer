interface Entry<T> {
  value: T;
  order: number;
}

/** Binary min-heap. Equal items come out in insertion order, which keeps traces deterministic. */
export class MinHeap<T> {
  private readonly items: Entry<T>[] = [];
  private counter = 0;

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0]?.value;
  }

  push(value: T): void {
    this.items.push({ value, order: this.counter++ });
    this.siftUp(this.items.length - 1);
  }

  pop(): T | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (top === undefined || last === undefined) return undefined;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return top.value;
  }

  private less(i: number, j: number): boolean {
    const a = this.items[i] as Entry<T>;
    const b = this.items[j] as Entry<T>;
    const c = this.compare(a.value, b.value);
    return c < 0 || (c === 0 && a.order < b.order);
  }

  private swap(i: number, j: number): void {
    const tmp = this.items[i] as Entry<T>;
    this.items[i] = this.items[j] as Entry<T>;
    this.items[j] = tmp;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) return;
      this.swap(i, parent);
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.items.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && this.less(l, smallest)) smallest = l;
      if (r < n && this.less(r, smallest)) smallest = r;
      if (smallest === i) return;
      this.swap(i, smallest);
      i = smallest;
    }
  }
}
