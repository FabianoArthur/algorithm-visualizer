import type { Grid } from '../pathfinding/grid';
import type { PathState } from '../pathfinding/state';
import type { Palette, Surface } from './canvas';

export interface GridLayout {
  cell: number;
  x0: number;
  y0: number;
}

export function gridLayout(grid: Grid, width: number, height: number): GridLayout {
  const cell = Math.max(4, Math.floor(Math.min((width - 16) / grid.cols, (height - 16) / grid.rows)));
  return {
    cell,
    x0: Math.floor((width - cell * grid.cols) / 2),
    y0: Math.floor((height - cell * grid.rows) / 2),
  };
}

/** Maps a CSS-pixel point to a cell index, or null outside the grid. */
export function cellAt(grid: Grid, layout: GridLayout, x: number, y: number): number | null {
  const col = Math.floor((x - layout.x0) / layout.cell);
  const row = Math.floor((y - layout.y0) / layout.cell);
  if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) return null;
  return grid.cell(row, col);
}

export function drawGrid(surface: Surface, grid: Grid, state: PathState, palette: Palette): GridLayout {
  const { ctx, width, height } = surface;
  const layout = gridLayout(grid, width, height);
  const { cell: s, x0, y0 } = layout;
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const rect = (c: number, inset: number, color: string): void => {
    const [r, col] = grid.rowCol(c);
    ctx.fillStyle = color;
    ctx.fillRect(x0 + col * s + inset, y0 + r * s + inset, s - inset * 2, s - inset * 2);
  };

  state.visited.forEach((c) => {
    rect(c, 0, palette.visited);
  });
  state.frontier.forEach((c) => {
    rect(c, 0, palette.frontier);
  });
  grid.weights.forEach((_w, c) => {
    // Heavy cells stay recognisable after being explored: full tile when fresh, inner tile once visited.
    const explored = state.visited.has(c) || state.frontier.has(c);
    rect(c, explored ? Math.round(s * 0.28) : 0, palette.weight);
  });

  // grid lines
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let r = 0; r <= grid.rows; r++) {
    ctx.moveTo(x0, y0 + r * s + 0.5);
    ctx.lineTo(x0 + grid.cols * s, y0 + r * s + 0.5);
  }
  for (let c = 0; c <= grid.cols; c++) {
    ctx.moveTo(x0 + c * s + 0.5, y0);
    ctx.lineTo(x0 + c * s + 0.5, y0 + grid.rows * s);
  }
  ctx.stroke();

  grid.walls.forEach((c) => {
    rect(c, 0, palette.wall);
  });

  const center = (c: number): [number, number] => {
    const [r, col] = grid.rowCol(c);
    return [x0 + col * s + s / 2, y0 + r * s + s / 2];
  };

  if (state.current !== null) {
    const [cx, cy] = center(state.current);
    ctx.strokeStyle = palette.current;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - s / 2 + 1, cy - s / 2 + 1, s - 2, s - 2);
  }

  if (state.path.length > 1) {
    ctx.strokeStyle = palette.path;
    ctx.lineWidth = Math.max(2, s * 0.32);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    state.path.forEach((c, k) => {
      const [cx, cy] = center(c);
      if (k === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
  }

  const endpoint = (c: number, color: string, diamond: boolean): void => {
    const [cx, cy] = center(c);
    const radius = Math.max(3, s * 0.38);
    ctx.fillStyle = color;
    ctx.beginPath();
    if (diamond) {
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius, cy);
      ctx.lineTo(cx, cy + radius);
      ctx.lineTo(cx - radius, cy);
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  endpoint(grid.start, palette.start, false);
  endpoint(grid.target, palette.target, true);
  return layout;
}
