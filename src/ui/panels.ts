import { Player } from '../core/player';
import { PATH_ALGORITHMS, getPathAlgorithm } from '../pathfinding/algorithms';
import type { Grid } from '../pathfinding/grid';
import { PathReplay } from '../pathfinding/state';
import type { PathAlgorithmId, PathResult } from '../pathfinding/types';
import { SORT_ALGORITHMS, getSortAlgorithm } from '../sorting/algorithms';
import { SortReplay } from '../sorting/state';
import type { SortAlgorithmId } from '../sorting/types';
import { drawBars } from './bars';
import { fitCanvas, type Palette } from './canvas';
import { drawGrid, type GridLayout } from './gridView';

const fmt = new Intl.NumberFormat('en-US');

/** Renders stats text; array items are emphasised. Built with DOM nodes, never innerHTML. */
function setStats(el: HTMLElement, parts: readonly (string | readonly [string])[]): void {
  el.replaceChildren(
    ...parts.map((p) => {
      if (typeof p === 'string') return p;
      const b = document.createElement('b');
      b.textContent = p[0];
      return b;
    }),
  );
}

abstract class PanelBase<Id extends string> {
  readonly el: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly player = new Player(0);
  protected readonly select: HTMLSelectElement;
  protected readonly note: HTMLElement;
  protected readonly stats: HTMLElement;

  constructor(
    template: HTMLTemplateElement,
    options: readonly { id: Id; name: string }[],
    public algorithm: Id,
    onAlgorithmChange: (panel: PanelBase<Id>) => void,
  ) {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    this.el = fragment.querySelector('.panel') as HTMLElement;
    this.canvas = this.el.querySelector('canvas') as HTMLCanvasElement;
    this.select = this.el.querySelector('select') as HTMLSelectElement;
    this.note = this.el.querySelector('.note') as HTMLElement;
    this.stats = this.el.querySelector('.stats') as HTMLElement;
    for (const o of options) this.select.add(new Option(o.name, o.id, false, o.id === algorithm));
    this.select.addEventListener('change', () => {
      this.algorithm = this.select.value as Id;
      onAlgorithmChange(this);
    });
  }

  abstract draw(palette: Palette): void;
  /** One-line plain-text summary for the screen-reader announcer. */
  abstract summary(): string;
}

export class SortPanel extends PanelBase<SortAlgorithmId> {
  private replay = new SortReplay([], []);

  constructor(template: HTMLTemplateElement, algorithm: SortAlgorithmId, onChange: (p: SortPanel) => void) {
    super(template, SORT_ALGORITHMS, algorithm, onChange as (p: PanelBase<SortAlgorithmId>) => void);
  }

  load(input: readonly number[]): void {
    const algorithm = getSortAlgorithm(this.algorithm);
    this.note.textContent = algorithm.complexity;
    const steps = algorithm.run(input);
    this.replay = new SortReplay(input, steps);
    this.player.setLength(steps.length);
  }

  draw(palette: Palette): void {
    const surface = fitCanvas(this.canvas);
    const state = this.replay.at(this.player.index);
    if (surface) drawBars(surface, state, palette);
    setStats(this.stats, [
      'step ',
      [fmt.format(this.player.index)],
      ` / ${fmt.format(this.player.length)} · `,
      [fmt.format(state.comparisons)],
      ' comparisons · ',
      [fmt.format(state.writes)],
      ' writes',
      ...(this.player.finished ? [' · ', ['sorted ✓'] as const] : []),
    ]);
    this.canvas.setAttribute('aria-label', `${this.select.selectedOptions[0]?.text ?? ''}: ${this.summary()}`);
  }

  summary(): string {
    const s = this.replay.at(this.player.index);
    return `${this.select.selectedOptions[0]?.text ?? ''}, step ${this.player.index} of ${this.player.length}, ${s.comparisons} comparisons, ${s.writes} writes${this.player.finished ? ', sorted' : ''}.`;
  }
}

export class PathPanel extends PanelBase<PathAlgorithmId> {
  layout: GridLayout | null = null;
  private replay = new PathReplay([]);
  private result: PathResult | null = null;

  constructor(
    template: HTMLTemplateElement,
    algorithm: PathAlgorithmId,
    private grid: Grid,
    onChange: (p: PathPanel) => void,
  ) {
    super(template, PATH_ALGORITHMS, algorithm, onChange as (p: PanelBase<PathAlgorithmId>) => void);
    this.el.querySelector('.stage')?.classList.add('grid');
  }

  private fitStage(): void {
    const stage = this.el.querySelector<HTMLElement>('.stage');
    // Match the grid's proportions (plus the 16px drawing margin) so the canvas has no dead bands.
    if (stage) stage.style.aspectRatio = `${this.grid.cols * 16 + 16} / ${this.grid.rows * 16 + 16}`;
  }

  load(grid: Grid): void {
    this.grid = grid;
    this.fitStage();
    const algorithm = getPathAlgorithm(this.algorithm);
    this.note.textContent = algorithm.note;
    this.result = algorithm.run(grid);
    this.replay = new PathReplay(this.result.trace);
    this.player.setLength(this.result.trace.length);
  }

  draw(palette: Palette): void {
    const surface = fitCanvas(this.canvas);
    const state = this.replay.at(this.player.index);
    if (surface) this.layout = drawGrid(surface, this.grid, state, palette);
    let tail: (string | readonly [string])[] = [' · frontier ', [fmt.format(state.frontier.size)]];
    if (this.player.finished && this.result) {
      tail =
        this.result.path === null
          ? [' · ', ['no path']]
          : [' · path ', [String(this.result.steps ?? 0)], ' moves · cost ', [String(this.result.cost ?? 0)]];
    }
    setStats(this.stats, ['visited ', [fmt.format(state.visited.size)], ...tail]);
    this.canvas.setAttribute('aria-label', `${this.select.selectedOptions[0]?.text ?? ''}: ${this.summary()}`);
  }

  summary(): string {
    const s = this.replay.at(this.player.index);
    const name = this.select.selectedOptions[0]?.text ?? '';
    if (!this.player.finished || !this.result) return `${name}, ${s.visited.size} cells visited so far.`;
    if (this.result.path === null) return `${name} visited ${s.visited.size} cells: the target is unreachable.`;
    return `${name} visited ${s.visited.size} cells and found a path of ${this.result.steps ?? 0} moves costing ${this.result.cost ?? 0}.`;
  }
}

export type AnyPanel = SortPanel | PathPanel;
