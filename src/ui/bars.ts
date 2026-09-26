import type { SortState } from '../sorting/state';
import type { Palette, Surface } from './canvas';

const MAX_VALUE = 100;

export function drawBars({ ctx, width, height }: Surface, state: SortState, palette: Palette): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);
  const n = state.array.length;
  if (n === 0) return;
  const padX = 12;
  const padTop = 16;
  const padBottom = 10;
  const slot = (width - padX * 2) / n;
  const gap = slot > 10 ? 2 : slot > 4 ? 1 : 0;
  const usable = height - padTop - padBottom;
  const active = new Set(state.active);
  for (let i = 0; i < n; i++) {
    const value = state.array[i] as number;
    const h = Math.max(2, (value / MAX_VALUE) * usable);
    let color = palette.bar;
    if (state.sorted[i]) color = palette.sorted;
    if (active.has(i)) color = state.activeKind === 'compare' ? palette.compare : palette.write;
    ctx.fillStyle = color;
    const x = padX + i * slot;
    const radius = Math.min(3, (slot - gap) / 2);
    ctx.beginPath();
    ctx.roundRect(x + gap / 2, padTop + usable - h, Math.max(1, slot - gap), h, [radius, radius, 0, 0]);
    ctx.fill();
  }
}
