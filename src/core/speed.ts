const MIN = 2;
const MAX = 2000;

/** Slider position (0–100) → steps per second, on a log scale so both ends are usable. */
export function speedFromSlider(position: number): number {
  const t = Math.min(100, Math.max(0, position)) / 100;
  return Math.round(MIN * (MAX / MIN) ** t);
}
