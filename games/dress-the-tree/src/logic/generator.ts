import { type Board, EMPTY, HOOKS, makeBranches, neighbours, torque } from './board';
import { rng } from './rng';

/** One level as data. Content lives in content/levels.ts; the layout is built from `seed`. */
export interface LevelSpec {
  rows: number;
  /** Toy kinds on the level, one triple each. Repeat a kind to get two triples of it. */
  kinds: number[];
  /** Branches with one hidden layer of toys behind the needles. */
  hidden?: number;
  /** Snowed-in branches: thaw after a triple next to them. */
  frozen?: number;
  /** Torque limit; 0 = weight is off (first levels). */
  limit: number;
  /** Max |tilt| at the start as a fraction of the limit. */
  startTilt?: number;
  /** Layout seed. Checked by the solver in tests/unit/dress-the-tree.levels.test.ts. */
  seed: number;
}

export function freeHooks(spec: LevelSpec) {
  return spec.rows * 2 * HOOKS - (spec.kinds.length * 3 - (spec.hidden ?? 0) * HOOKS);
}

const hasTriple = (h: number[]) => h.length === HOOKS && h[0] !== EMPTY && h.every((k) => k === h[0]);

/**
 * Builds the starting board for a level. Deterministic: same spec → same board.
 * Rejects layouts with ready-made triples or a tree that already leans too much.
 * Solvability is not checked here (that is the solver's job in tests).
 */
export function generate(spec: LevelSpec, weights: number[]): Board {
  const r = rng(spec.seed);
  const branches = makeBranches(spec.rows);
  const n = branches.length;
  const hidden = spec.hidden ?? 0;
  const frozen = spec.frozen ?? 0;
  if (freeHooks(spec) < 2) throw new Error('level needs at least 2 free hooks');
  if (hidden + frozen > n) throw new Error('too many special branches');

  for (let attempt = 0; attempt < 5000; attempt++) {
    const toys = r.shuffle(spec.kinds.flatMap((k) => [k, k, k]));
    const order = r.shuffle([...Array(n).keys()]);
    const hiddenIdx = order.slice(0, hidden);
    const frozenIdx = order.slice(hidden, hidden + frozen);
    const isFrozen = Array.from({ length: n }, (_, i) => frozenIdx.includes(i));
    // Every frozen branch needs a neighbour that can thaw it.
    if (frozenIdx.some((i) => neighbours({ branches } as Board, i).every((j) => isFrozen[j]))) continue;

    const hooks = Array.from({ length: n }, () => Array(HOOKS).fill(EMPTY) as number[]);
    const back = Array.from({ length: n }, () => [] as number[][]);
    for (const i of hiddenIdx) back[i].push(toys.splice(0, HOOKS));
    for (const i of frozenIdx) hooks[i] = toys.splice(0, HOOKS);

    const open = r.shuffle(
      [...Array(n).keys()].filter((i) => !isFrozen[i]).flatMap((i) => [...Array(HOOKS).keys()].map((h) => [i, h] as const)),
    );
    if (open.length < toys.length) continue;
    toys.forEach((k, j) => { const [i, h] = open[j]; hooks[i][h] = k; });

    if (hooks.some(hasTriple) || back.some((ls) => ls.some(hasTriple))) continue;
    const board: Board = {
      branches, hooks, back, frozen: isFrozen, spare: [], weights, weightOn: spec.limit > 0, limit: spec.limit,
    };
    if (board.weightOn && Math.abs(torque(board)) > spec.limit * (spec.startTilt ?? 0.35)) continue;
    return board;
  }
  throw new Error(`no layout for seed ${spec.seed}`);
}
