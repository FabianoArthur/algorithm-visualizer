import type { Rng } from '../core/rng';

export type Endpoint = 'start' | 'target';

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 9;

/**
 * Rectangular grid of cells addressed by index (row * cols + col).
 * Entering a cell costs its weight (1 by default); walls can't be entered.
 */
export class Grid {
  readonly walls = new Set<number>();
  readonly weights = new Map<number, number>();
  start: number;
  target: number;

  constructor(
    readonly rows: number,
    readonly cols: number,
  ) {
    if (rows < 1 || cols < 2 || !Number.isInteger(rows) || !Number.isInteger(cols)) {
      throw new RangeError(`Grid must be at least 1×2, got ${rows}×${cols}`);
    }
    const mid = Math.floor(rows / 2);
    const inset = cols >= 4 ? 1 : 0;
    this.start = this.cell(mid, inset);
    this.target = this.cell(mid, cols - 1 - inset);
  }

  get size(): number {
    return this.rows * this.cols;
  }

  cell(row: number, col: number): number {
    return row * this.cols + col;
  }

  rowCol(cell: number): [number, number] {
    return [Math.floor(cell / this.cols), cell % this.cols];
  }

  inBounds(cell: number): boolean {
    return Number.isInteger(cell) && cell >= 0 && cell < this.size;
  }

  isEndpoint(cell: number): boolean {
    return cell === this.start || cell === this.target;
  }

  isWall(cell: number): boolean {
    return this.walls.has(cell);
  }

  weight(cell: number): number {
    return this.weights.get(cell) ?? MIN_WEIGHT;
  }

  /** Returns false when the cell can't hold a wall (endpoint or out of bounds). */
  setWall(cell: number, wall: boolean): boolean {
    if (!this.inBounds(cell)) return false;
    if (!wall) {
      this.walls.delete(cell);
      return true;
    }
    if (this.isEndpoint(cell)) return false;
    this.walls.add(cell);
    this.weights.delete(cell);
    return true;
  }

  /** Weight must be an integer in [1, 9]; that lower bound is what keeps A*'s heuristic admissible. */
  setWeight(cell: number, weight: number): void {
    if (!Number.isInteger(weight) || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
      throw new RangeError(`Weight must be an integer in [${MIN_WEIGHT}, ${MAX_WEIGHT}], got ${weight}`);
    }
    if (!this.inBounds(cell)) return;
    this.walls.delete(cell);
    if (weight === MIN_WEIGHT) this.weights.delete(cell);
    else this.weights.set(cell, weight);
  }

  moveEndpoint(which: Endpoint, cell: number): boolean {
    if (!this.inBounds(cell)) return false;
    const other = which === 'start' ? this.target : this.start;
    if (cell === other) return false;
    this.walls.delete(cell);
    this[which] = cell;
    return true;
  }

  /** Open 4-way neighbours in a fixed order (up, right, down, left) so traces are deterministic. */
  neighbors(cell: number): number[] {
    const [r, c] = this.rowCol(cell);
    const out: number[] = [];
    if (r > 0) out.push(cell - this.cols);
    if (c < this.cols - 1) out.push(cell + 1);
    if (r < this.rows - 1) out.push(cell + this.cols);
    if (c > 0) out.push(cell - 1);
    return out.filter((n) => !this.walls.has(n));
  }

  clear(): void {
    this.walls.clear();
    this.weights.clear();
  }

  /** Scatters walls and heavy cells (a fixed `weight`, or random 2–9 when omitted); endpoints stay free. */
  randomize(
    rng: Rng,
    { wallDensity, weightDensity, weight }: { wallDensity: number; weightDensity: number; weight?: number },
  ): void {
    this.clear();
    for (let cell = 0; cell < this.size; cell++) {
      if (this.isEndpoint(cell)) continue;
      const roll = rng.next();
      if (roll < wallDensity) this.walls.add(cell);
      else if (roll < wallDensity + weightDensity) this.setWeight(cell, weight ?? rng.int(2, MAX_WEIGHT));
    }
  }

  clone(): Grid {
    const g = new Grid(this.rows, this.cols);
    g.start = this.start;
    g.target = this.target;
    this.walls.forEach((c) => g.walls.add(c));
    this.weights.forEach((w, c) => g.weights.set(c, w));
    return g;
  }
}
