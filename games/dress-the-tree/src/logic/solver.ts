import { type Board, EMPTY, type Move, applyMove, get, legalMoves, status, toysLeft, torque } from './board';

export interface SolveResult { solved: boolean; moves: Move[]; nodes: number }

function key(b: Board) {
  return b.hooks.map((h) => h.join(',')).join('|') + '#' + b.back.map((l) => l.length).join('')
    + '#' + b.frozen.map(Number).join('') + '#' + b.spare.join(',');
}

/** Move ordering: finish triples first, build pairs, keep the tree straight. */
function score(b: Board, m: Move): number {
  const k = get(b, m.from);
  let s = 0;
  if (m.to.branch >= 0) {
    const others = b.hooks[m.to.branch].filter((_, i) => i !== m.to.hook);
    const same = others.filter((x) => x === k).length;
    const diff = others.filter((x) => x !== k && x !== EMPTY).length;
    if (same === 2) s += 1000;
    s += same * 60 - diff * 25;
    if (m.from.branch === m.to.branch) s -= 80;
  } else {
    s -= 40;
  }
  if (m.from.branch >= 0) {
    const others = b.hooks[m.from.branch].filter((_, i) => i !== m.from.hook);
    s -= others.filter((x) => x === k).length * 50;
    s += others.filter((x) => x !== k && x !== EMPTY).length * 10;
  } else {
    s += 30;
  }
  return s;
}

/**
 * Depth-first search with memo and a node budget. Finds *a* solution under the balance rule,
 * not the shortest one. Used to prove every shipped level is winnable.
 */
export function solve(start: Board, budget = 200_000): SolveResult {
  const seen = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;
  // Wandering deeper than this means shuffling toys back and forth; cut it.
  const maxDepth = toysLeft(start) * 2 + 10;

  const dfs = (b: Board): boolean => {
    const st = status(b);
    if (st === 'won') return true;
    if (st === 'lost') return false;
    if (++nodes > budget || path.length > maxDepth) return false;
    const k = key(b);
    if (seen.has(k)) return false;
    seen.add(k);
    const moves = legalMoves(b)
      .map((m) => {
        const next = applyMove(b, m).board;
        const lean = b.weightOn ? Math.abs(torque(next)) / b.limit : 0;
        return { m, next, s: score(b, m) - lean * 120 };
      })
      .filter((x) => status(x.next) !== 'lost')
      .sort((a, c) => c.s - a.s);
    for (const { m, next } of moves) {
      path.push(m);
      if (dfs(next)) return true;
      path.pop();
      if (nodes > budget) return false;
    }
    return false;
  };

  const solved = dfs(start);
  return { solved, moves: solved ? [...path] : [], nodes };
}
