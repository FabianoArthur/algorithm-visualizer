/**
 * Playback head over a precomputed trace of `length` steps.
 * `index` is the number of steps already applied (0 = initial state, length = final state).
 * Pure: no timers or DOM — the caller feeds elapsed time through `tick`.
 */
export class Player {
  /** Steps per second while playing. */
  speed = 20;
  private _index = 0;
  private _playing = false;
  private carry = 0;

  constructor(private _length: number) {}

  get index(): number {
    return this._index;
  }

  get length(): number {
    return this._length;
  }

  get playing(): boolean {
    return this._playing;
  }

  get finished(): boolean {
    return this._index >= this._length;
  }

  play(): void {
    if (this._length === 0) return;
    if (this.finished) this._index = 0;
    this._playing = true;
    this.carry = 0;
  }

  pause(): void {
    this._playing = false;
  }

  toggle(): void {
    if (this._playing) this.pause();
    else this.play();
  }

  stepForward(): void {
    this.seek(this._index + 1);
  }

  stepBack(): void {
    this.seek(this._index - 1);
  }

  seek(index: number): void {
    this._index = Math.min(this._length, Math.max(0, Math.floor(index)));
    if (this.finished) this._playing = false;
  }

  reset(): void {
    this._playing = false;
    this._index = 0;
    this.carry = 0;
  }

  setLength(length: number): void {
    this._length = length;
    this.seek(this._index);
  }

  /** Advances playback by `dtMs` of wall time. Returns true if the index moved. */
  tick(dtMs: number): boolean {
    if (!this._playing) return false;
    this.carry += (dtMs / 1000) * this.speed;
    const whole = Math.floor(this.carry);
    if (whole === 0) return false;
    this.carry -= whole;
    const before = this._index;
    this.seek(this._index + whole);
    return this._index !== before;
  }
}
