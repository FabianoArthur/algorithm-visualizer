import type { Rng } from '../core/rng';

export type InputPresetId = 'random' | 'nearly-sorted' | 'reversed' | 'few-unique';

export const INPUT_PRESETS: readonly { id: InputPresetId; name: string }[] = [
  { id: 'random', name: 'Random' },
  { id: 'nearly-sorted', name: 'Nearly sorted' },
  { id: 'reversed', name: 'Reversed' },
  { id: 'few-unique', name: 'Few unique' },
];

/** n integer values in [1, 100] shaped by the preset. */
export function makeInput(preset: InputPresetId, n: number, rng: Rng): number[] {
  const random = (): number[] => Array.from({ length: n }, () => rng.int(1, 100));
  switch (preset) {
    case 'random':
      return random();
    case 'reversed':
      return random().sort((a, b) => b - a);
    case 'nearly-sorted': {
      const values = random().sort((a, b) => a - b);
      const swaps = Math.max(1, Math.floor(n / 20));
      for (let k = 0; k < swaps && n > 1; k++) {
        const i = rng.int(0, n - 2);
        const tmp = values[i] as number;
        values[i] = values[i + 1] as number;
        values[i + 1] = tmp;
      }
      return values;
    }
    case 'few-unique': {
      const pool = [20, 40, 60, 80, 100];
      return Array.from({ length: n }, () => pool[rng.int(0, pool.length - 1)] as number);
    }
  }
}
