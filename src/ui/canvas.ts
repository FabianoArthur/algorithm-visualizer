export interface Surface {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

/** Sizes the backing store to the element's CSS box × devicePixelRatio and returns a CSS-pixel context. */
export function fitCanvas(canvas: HTMLCanvasElement): Surface | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

export type Palette = Record<
  | 'bg'
  | 'grid'
  | 'bar'
  | 'compare'
  | 'write'
  | 'sorted'
  | 'wall'
  | 'weight'
  | 'frontier'
  | 'visited'
  | 'current'
  | 'path'
  | 'start'
  | 'target',
  string
>;

/** Reads the --viz-* tokens from CSS so light/dark themes stay in one place. */
export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string): string => css.getPropertyValue(`--viz-${name}`).trim();
  return {
    bg: v('bg'),
    grid: v('grid'),
    bar: v('bar'),
    compare: v('compare'),
    write: v('write'),
    sorted: v('sorted'),
    wall: v('wall'),
    weight: v('weight'),
    frontier: v('frontier'),
    visited: v('visited'),
    current: v('current'),
    path: v('path'),
    start: v('start'),
    target: v('target'),
  };
}
