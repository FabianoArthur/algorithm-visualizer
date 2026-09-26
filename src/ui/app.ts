import { createRng } from '../core/rng';
import { speedFromSlider } from '../core/speed';
import { Grid } from '../pathfinding/grid';
import type { PathAlgorithmId } from '../pathfinding/types';
import { INPUT_PRESETS, makeInput, type InputPresetId } from '../sorting/inputs';
import type { SortAlgorithmId } from '../sorting/types';
import { readPalette, type Palette } from './canvas';
import { cellAt } from './gridView';
import { PathPanel, SortPanel, type AnyPanel } from './panels';

type Mode = 'sorting' | 'pathfinding';
type Tool = 'wall' | 'weight' | 'erase';

const HEAVY_WEIGHT = 5;

function $<T extends Element>(root: ParentNode, selector: string, type: abstract new () => T): T {
  const el = root.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Missing element: ${selector}`);
  return el;
}

/** Cells on the straight line between two cells, so fast pointer drags don't leave gaps. */
function lineCells(grid: Grid, from: number, to: number): number[] {
  const [r0, c0] = grid.rowCol(from);
  const [r1, c1] = grid.rowCol(to);
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  const out: number[] = [];
  for (let k = 1; k <= n; k++) {
    out.push(grid.cell(Math.round(r0 + ((r1 - r0) * k) / n), Math.round(c0 + ((c1 - c0) * k) / n)));
  }
  return out;
}

export function createApp(doc: Document): void {
  const template = $(doc, '#panel-template', HTMLTemplateElement);
  const panelsEl = $(doc, '#panels', HTMLElement);
  const playBtn = $(doc, '#play', HTMLButtonElement);
  const scrubber = $(doc, '#scrubber', HTMLInputElement);
  const stepLabel = $(doc, '#step-label', HTMLOutputElement);
  const speedInput = $(doc, '#speed', HTMLInputElement);
  const speedLabel = $(doc, '#speed-label', HTMLOutputElement);
  const compareInput = $(doc, '#compare', HTMLInputElement);
  const presetSelect = $(doc, '#preset', HTMLSelectElement);
  const sizeInput = $(doc, '#size', HTMLInputElement);
  const sizeLabel = $(doc, '#size-label', HTMLOutputElement);
  const announcer = $(doc, '#announcer', HTMLElement);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const narrow = window.innerWidth < 700;

  const rng = createRng(Date.now() % 2 ** 31);
  const state = {
    mode: 'sorting' as Mode,
    compare: false,
    preset: 'random' as InputPresetId,
    size: Number(sizeInput.value),
    input: [] as number[],
    sortAlgos: ['quick', 'bubble'] as SortAlgorithmId[],
    pathAlgos: ['astar', 'dijkstra'] as PathAlgorithmId[],
    grid: new Grid(narrow ? 17 : 21, narrow ? 21 : 41),
    tool: 'wall' as Tool,
  };
  let panels: AnyPanel[] = [];
  let palette: Palette = readPalette();

  // ---------- rendering ----------
  const drawAll = (): void => {
    for (const p of panels) p.draw(palette);
    const max = Math.max(0, ...panels.map((p) => p.player.length));
    const index = Math.max(0, ...panels.map((p) => p.player.index));
    scrubber.max = String(max);
    scrubber.value = String(index);
    stepLabel.value = `${index} / ${max}`;
    const playing = panels.some((p) => p.player.playing);
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };

  const announce = (): void => {
    announcer.textContent = panels.map((p) => p.summary()).join(' ');
  };

  // ---------- loading data into panels ----------
  const loadPanel = (p: AnyPanel): void => {
    if (p instanceof SortPanel) p.load(state.input);
    else p.load(state.grid);
  };

  const reloadAll = (keepFinished: boolean): void => {
    const wasFinished = keepFinished && panels.length > 0 && panels.every((p) => p.player.finished && p.player.length > 0);
    for (const p of panels) {
      loadPanel(p);
      if (wasFinished) p.player.seek(p.player.length);
      else p.player.reset();
    }
    drawAll();
  };

  const newInput = (): void => {
    state.input = makeInput(state.preset, state.size, rng);
    reloadAll(false);
  };

  const onAlgorithmChange = (p: AnyPanel): void => {
    const slot = panels.indexOf(p);
    if (p instanceof SortPanel) state.sortAlgos[slot] = p.algorithm;
    else state.pathAlgos[slot] = p.algorithm;
    // Changing one side restarts both so the comparison stays aligned step for step.
    reloadAll(false);
  };

  const buildPanels = (): void => {
    for (const p of panels) p.player.pause();
    const count = state.compare ? 2 : 1;
    panels = Array.from({ length: count }, (_, slot) =>
      state.mode === 'sorting'
        ? new SortPanel(template, state.sortAlgos[slot] as SortAlgorithmId, onAlgorithmChange)
        : new PathPanel(template, state.pathAlgos[slot] as PathAlgorithmId, state.grid, onAlgorithmChange),
    );
    panelsEl.replaceChildren(...panels.map((p) => p.el));
    panelsEl.classList.toggle('compare', state.compare);
    for (const p of panels) if (p instanceof PathPanel) attachGridEditing(p);
    reloadAll(false);
  };

  // ---------- grid editing ----------
  function attachGridEditing(panel: PathPanel): void {
    const canvas = panel.canvas;
    let drag: 'start' | 'target' | 'paint' | null = null;
    let paintOn = true;
    let last: number | null = null;

    const cellFromEvent = (e: PointerEvent): number | null => {
      if (!panel.layout) return null;
      const rect = canvas.getBoundingClientRect();
      return cellAt(state.grid, panel.layout, e.clientX - rect.left, e.clientY - rect.top);
    };

    const paint = (cell: number): boolean => {
      const g = state.grid;
      if (g.isEndpoint(cell)) return false;
      if (state.tool === 'wall') return g.setWall(cell, paintOn) && true;
      if (state.tool === 'weight') g.setWeight(cell, paintOn ? HEAVY_WEIGHT : 1);
      else {
        g.setWall(cell, false);
        g.setWeight(cell, 1);
      }
      return true;
    };

    canvas.addEventListener('pointerdown', (e) => {
      const cell = cellFromEvent(e);
      if (cell === null || e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      last = cell;
      if (cell === state.grid.start) drag = 'start';
      else if (cell === state.grid.target) drag = 'target';
      else {
        drag = 'paint';
        paintOn =
          state.tool === 'wall'
            ? !state.grid.isWall(cell)
            : state.tool === 'weight'
              ? state.grid.weight(cell) === 1
              : true;
        if (paint(cell)) reloadAll(true);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const cell = cellFromEvent(e);
      if (cell === null || cell === last) return;
      let changed = false;
      if (drag === 'paint' && last !== null) {
        for (const c of lineCells(state.grid, last, cell)) changed = paint(c) || changed;
      } else if (drag !== 'paint' && !state.grid.isWall(cell)) {
        changed = state.grid.moveEndpoint(drag, cell);
      }
      last = cell;
      if (changed) reloadAll(true);
    });

    const end = (): void => {
      drag = null;
      last = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  // ---------- playback ----------
  const setSpeed = (): void => {
    const speed = speedFromSlider(Number(speedInput.value));
    speedLabel.value = `${speed}/s`;
    for (const p of panels) p.player.speed = speed;
  };

  const togglePlay = (): void => {
    const playing = panels.some((p) => p.player.playing);
    if (playing) {
      for (const p of panels) p.player.pause();
      announce();
    } else if (panels.every((p) => p.player.finished)) {
      for (const p of panels) p.player.play(); // restarts from the beginning
    } else {
      for (const p of panels) if (!p.player.finished) p.player.play();
    }
    setSpeed();
    drawAll();
  };

  const step = (delta: 1 | -1): void => {
    for (const p of panels) {
      p.player.pause();
      if (delta > 0) p.player.stepForward();
      else p.player.stepBack();
    }
    drawAll();
    announce();
  };

  const rewind = (): void => {
    for (const p of panels) p.player.reset();
    drawAll();
    announce();
  };

  let lastTime: number | null = null;
  const frame = (now: number): void => {
    const dt = lastTime === null ? 0 : Math.min(now - lastTime, 100);
    lastTime = now;
    let moved = false;
    let wasPlaying = false;
    for (const p of panels) {
      wasPlaying ||= p.player.playing;
      moved = p.player.tick(dt) || moved;
    }
    if (moved) {
      drawAll();
      if (wasPlaying && !panels.some((p) => p.player.playing)) announce();
    }
    requestAnimationFrame(frame);
  };

  // ---------- controls ----------
  doc.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode as Mode;
      doc.querySelectorAll('[data-mode]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      doc.querySelectorAll<HTMLElement>('[data-for]').forEach((el) => {
        el.hidden = el.dataset.for !== state.mode;
      });
      buildPanels();
      setSpeed();
    });
  });

  doc.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tool = btn.dataset.tool as Tool;
      doc.querySelectorAll('[data-tool]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
  });

  playBtn.addEventListener('click', togglePlay);
  $(doc, '#step-forward', HTMLButtonElement).addEventListener('click', () => {
    step(1);
  });
  $(doc, '#step-back', HTMLButtonElement).addEventListener('click', () => {
    step(-1);
  });
  $(doc, '#reset', HTMLButtonElement).addEventListener('click', rewind);

  scrubber.addEventListener('input', () => {
    for (const p of panels) {
      p.player.pause();
      p.player.seek(Number(scrubber.value));
    }
    drawAll();
  });

  speedInput.addEventListener('input', setSpeed);

  compareInput.addEventListener('change', () => {
    state.compare = compareInput.checked;
    buildPanels();
    setSpeed();
  });

  for (const preset of INPUT_PRESETS) presetSelect.add(new Option(preset.name, preset.id));
  presetSelect.addEventListener('change', () => {
    state.preset = presetSelect.value as InputPresetId;
    newInput();
  });

  const updateSizeLabel = (): void => {
    sizeLabel.value = String(state.size);
  };
  sizeInput.addEventListener('input', () => {
    state.size = Number(sizeInput.value);
    updateSizeLabel();
    newInput();
  });

  $(doc, '#shuffle', HTMLButtonElement).addEventListener('click', newInput);

  const newMaze = (): void => {
    state.grid.randomize(rng, { wallDensity: 0.24, weightDensity: 0.12, weight: HEAVY_WEIGHT });
    reloadAll(false);
  };
  $(doc, '#maze', HTMLButtonElement).addEventListener('click', newMaze);
  $(doc, '#clear', HTMLButtonElement).addEventListener('click', () => {
    state.grid.clear();
    reloadAll(false);
  });

  doc.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, select, textarea, [contenteditable="true"]')) return;
    // Let focused buttons keep their native Space/Enter activation.
    if (target?.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    switch (e.key) {
      case ' ':
        togglePlay();
        break;
      case 'ArrowRight':
        step(1);
        break;
      case 'ArrowLeft':
        step(-1);
        break;
      case 'r':
      case 'R':
        rewind();
        break;
      case 'n':
      case 'N':
        if (state.mode === 'sorting') newInput();
        else newMaze();
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  // ---------- environment ----------
  darkScheme.addEventListener('change', () => {
    palette = readPalette();
    drawAll();
  });
  new ResizeObserver(() => {
    drawAll();
  }).observe(panelsEl);

  // ---------- boot ----------
  if (reducedMotion.matches) speedInput.value = '20';
  updateSizeLabel();
  state.input = makeInput(state.preset, state.size, rng);
  state.grid.randomize(rng, { wallDensity: 0.22, weightDensity: 0.1, weight: HEAVY_WEIGHT });
  buildPanels();
  setSpeed();
  requestAnimationFrame(frame);
}
