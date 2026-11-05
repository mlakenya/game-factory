import type { LevelSpec } from '../src/logic/generator';

/**
 * 30 levels. Mechanics come one at a time:
 *  1–4 plain sorting (weight off), 5–12 weight and tilt, 13–20 toys behind the needles,
 *  21–30 snowed-in branches. `limit` is the torque the trunk holds (weight × hook distance).
 * Seeds are proven solvable by tests/unit/dress-the-tree.levels.test.ts.
 */
// Kind order mixes weights so every level has light, medium and heavy toys.
const MIX = [0, 7, 4, 1, 8, 5, 2, 9, 6, 3];
const pick = (n: number, from = 0) => Array.from({ length: n }, (_, i) => MIX[(from + i) % MIX.length]);

type Row = [rows: number, kinds: number[], limit: number, hidden: number, frozen: number, seed: number];
const ROWS: Row[] = [
  /*  1 */ [3, [0, 1, 2], 0, 0, 0, 1],
  /*  2 */ [3, [3, 7, 4, 8], 0, 0, 0, 1],
  /*  3 */ [3, pick(5, 2), 0, 0, 0, 1],
  /*  4 */ [3, pick(5, 5), 0, 0, 0, 1],
  /*  5 */ [3, pick(4), 22, 0, 0, 1],
  /*  6 */ [3, pick(4, 3), 18, 0, 0, 1],
  /*  7 */ [3, pick(5, 1), 15, 0, 0, 1],
  /*  8 */ [4, pick(5, 4), 14, 0, 0, 1],
  /*  9 */ [4, pick(6, 2), 14, 0, 0, 1],
  /* 10 */ [4, pick(6, 6), 12, 0, 0, 1],
  /* 11 */ [4, pick(7, 1), 13, 0, 0, 1],
  /* 12 */ [4, pick(7, 5), 11, 0, 0, 1],
  /* 13 */ [4, pick(6, 3), 14, 1, 0, 3],
  /* 14 */ [4, pick(7), 13, 1, 0, 3],
  /* 15 */ [4, pick(7, 4), 14, 2, 0, 8],
  /* 16 */ [4, pick(8, 2), 14, 2, 0, 4],
  /* 17 */ [5, pick(8, 6), 15, 2, 0, 3],
  /* 18 */ [5, pick(9, 1), 14, 2, 0, 2],
  /* 19 */ [5, pick(9, 5), 13, 3, 0, 38],
  /* 20 */ [5, pick(10), 13, 3, 0, 4],
  /* 21 */ [4, pick(6, 7), 14, 0, 1, 1],
  /* 22 */ [4, pick(7, 3), 13, 0, 1, 1],
  /* 23 */ [4, pick(7, 8), 13, 0, 2, 2],
  /* 24 */ [5, pick(8, 1), 15, 0, 2, 2],
  /* 25 */ [5, pick(9, 4), 14, 1, 2, 2],
  /* 26 */ [5, pick(9, 7), 15, 2, 2, 7],
  /* 27 */ [5, pick(10, 2), 13, 2, 2, 2],
  /* 28 */ [5, pick(11, 5), 13, 2, 3, 1],
  /* 29 */ [5, pick(11, 8), 12, 3, 3, 1],
  /* 30 */ [5, pick(12, 3), 12, 3, 3, 2],
];

export const LEVELS: LevelSpec[] = ROWS.map(([rows, kinds, limit, hidden, frozen, seed]) => ({
  rows, kinds, limit, hidden, frozen, seed,
}));

/** Level (1-based) where each mechanic first appears: shows a one-time hint. */
export const INTRO = { weight: 5, hidden: 13, frozen: 21 } as const;
