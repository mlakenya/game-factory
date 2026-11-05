/**
 * Pure rules of "Dress the Tree": sort-by-three on tree branches + whole-tree balance.
 * The trunk is the pivot. Every toy pulls with torque = weight × hook distance × side.
 * If |torque| goes over the limit, the star falls and the level is lost.
 */
export const EMPTY = -1;
export const HOOKS = 3;

export interface Branch {
  row: number; // 0 = top
  side: -1 | 1; // -1 left of trunk, 1 right
  dist: number[]; // HOOKS distances from the trunk, inner → outer
}

export interface Board {
  branches: Branch[];
  /** Front toys per branch, HOOKS slots each, EMPTY = free hook. */
  hooks: number[][];
  /** Hidden layers behind the needles per branch, next one first. Revealed when the branch clears a triple. */
  back: number[][][];
  frozen: boolean[];
  /** Hooks on the trunk itself (rewarded booster): zero torque. */
  spare: number[];
  /** Weight per toy kind. */
  weights: number[];
  weightOn: boolean;
  limit: number;
}

/** A place a toy can hang: a branch hook, or a trunk hook (branch = -1). */
export interface Slot { branch: number; hook: number }
export interface Move { from: Slot; to: Slot }
export interface MoveResult {
  board: Board;
  cleared: number[];
  revealed: number[];
  thawed: number[];
}

export function rowCount(board: Board) {
  return board.branches.reduce((m, b) => Math.max(m, b.row + 1), 0);
}

const ROW_START: Record<number, number[]> = {
  2: [1, 2],
  3: [1, 2, 2],
  4: [1, 1, 2, 2],
  5: [1, 1, 2, 2, 3],
};

/** Hook distances for a tree of `rows` rows: lower rows are longer, like a real fir. */
export function makeBranches(rows: number): Branch[] {
  const out: Branch[] = [];
  for (let row = 0; row < rows; row++) {
    const start = ROW_START[rows]?.[row] ?? 1 + Math.floor(row / 2);
    const dist = Array.from({ length: HOOKS }, (_, i) => start + i);
    out.push({ row, side: -1, dist }, { row, side: 1, dist });
  }
  return out;
}

export function clone(b: Board): Board {
  return {
    ...b,
    hooks: b.hooks.map((h) => [...h]),
    back: b.back.map((layers) => layers.map((l) => [...l])),
    frozen: [...b.frozen],
    spare: [...b.spare],
  };
}

export function torque(b: Board): number {
  let t = 0;
  b.hooks.forEach((h, i) => {
    const br = b.branches[i];
    h.forEach((k, j) => { if (k !== EMPTY) t += b.weights[k] * br.dist[j] * br.side; });
  });
  return t;
}

/** Tilt in [-1, 1] when within the limit; > 1 in absolute value means the star falls. */
export function tilt(b: Board): number {
  return b.weightOn ? torque(b) / b.limit : 0;
}

export function get(b: Board, s: Slot): number {
  return s.branch < 0 ? b.spare[s.hook] : b.hooks[s.branch][s.hook];
}

function put(b: Board, s: Slot, k: number) {
  if (s.branch < 0) b.spare[s.hook] = k;
  else b.hooks[s.branch][s.hook] = k;
}

export function isLocked(b: Board, s: Slot) {
  return s.branch >= 0 && b.frozen[s.branch];
}

export function canMove(b: Board, m: Move): boolean {
  if (m.from.branch === m.to.branch && m.from.hook === m.to.hook) return false;
  if (isLocked(b, m.from) || isLocked(b, m.to)) return false;
  return get(b, m.from) !== EMPTY && get(b, m.to) === EMPTY;
}

/** Branches that thaw when `i` clears a triple: the other side of the same row, same side one row up/down. */
export function neighbours(b: Board, i: number): number[] {
  const me = b.branches[i];
  return b.branches.flatMap((o, j) => {
    if (j === i) return [];
    const sameRow = o.row === me.row;
    const vertical = o.side === me.side && Math.abs(o.row - me.row) === 1;
    return sameRow || vertical ? [j] : [];
  });
}

function isTriple(h: number[]) {
  return h[0] !== EMPTY && h.every((k) => k === h[0]);
}

/** Applies a move and resolves triples, reveals and thaws. Throws on an illegal move. */
export function applyMove(b0: Board, m: Move): MoveResult {
  if (!canMove(b0, m)) throw new Error('illegal move');
  const b = clone(b0);
  const k = get(b, m.from);
  put(b, m.from, EMPTY);
  put(b, m.to, k);
  const res: MoveResult = { board: b, cleared: [], revealed: [], thawed: [] };
  const queue = m.to.branch >= 0 ? [m.to.branch] : [];
  while (queue.length) {
    const i = queue.shift()!;
    if (!isTriple(b.hooks[i])) continue;
    b.hooks[i] = b.hooks[i].map(() => EMPTY);
    res.cleared.push(i);
    for (const n of neighbours(b, i)) {
      if (b.frozen[n]) { b.frozen[n] = false; res.thawed.push(n); }
    }
    const next = b.back[i].shift();
    if (next) {
      b.hooks[i] = [...next];
      res.revealed.push(i);
      queue.push(i); // a revealed layer could itself be a triple
    }
  }
  return res;
}

export function toysLeft(b: Board) {
  const count = (arr: number[]) => arr.filter((k) => k !== EMPTY).length;
  return b.hooks.reduce((s, h) => s + count(h), 0)
    + b.back.reduce((s, ls) => s + ls.reduce((t, l) => t + count(l), 0), 0)
    + count(b.spare);
}

export type Status = 'playing' | 'won' | 'lost';
export function status(b: Board): Status {
  if (b.weightOn && Math.abs(torque(b)) > b.limit) return 'lost';
  return toysLeft(b) === 0 ? 'won' : 'playing';
}

/** All legal moves (used by the solver and by hints in tests). */
export function legalMoves(b: Board): Move[] {
  const from: Slot[] = [];
  const to: Slot[] = [];
  b.hooks.forEach((h, branch) => {
    if (b.frozen[branch]) return;
    h.forEach((k, hook) => (k === EMPTY ? to : from).push({ branch, hook }));
  });
  b.spare.forEach((k, hook) => (k === EMPTY ? to : from).push({ branch: -1, hook }));
  const out: Move[] = [];
  for (const f of from) for (const t of to) if (f.branch !== t.branch || f.hook !== t.hook) out.push({ from: f, to: t });
  return out;
}

/** Adds one trunk hook (booster "extra hook"). */
export function addSpare(b0: Board): Board {
  const b = clone(b0);
  b.spare.push(EMPTY);
  return b;
}

/**
 * Booster "shuffle": shuffles visible movable toys among their hooks, but only between toys
 * of the same weight, so the tilt never changes. Uses a caller-supplied random source.
 */
export function shuffleSameWeight(b0: Board, random: () => number, attempt = 0): Board {
  const b = clone(b0);
  const byWeight = new Map<number, Slot[]>();
  b.hooks.forEach((h, branch) => {
    if (b.frozen[branch]) return;
    h.forEach((k, hook) => {
      if (k === EMPTY) return;
      const w = b.weights[k];
      if (!byWeight.has(w)) byWeight.set(w, []);
      byWeight.get(w)!.push({ branch, hook });
    });
  });
  // A slot keeps the weight it had, so torque is preserved exactly.
  for (const slots of byWeight.values()) {
    const kinds = slots.map((s) => get(b, s));
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    slots.forEach((s, i) => put(b, s, kinds[i]));
  }
  // Never hand the player a ready-made triple: retry, then fall back to the original layout.
  if (b.hooks.some(isTriple)) return attempt < 20 ? shuffleSameWeight(b0, random, attempt + 1) : clone(b0);
  return b;
}
