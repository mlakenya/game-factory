import { describe, expect, it } from 'vitest';
import {
  type Board, EMPTY, addSpare, applyMove, canMove, makeBranches, neighbours, shuffleSameWeight, status, torque,
} from '../../games/dress-the-tree/src/logic/board';
import { rng } from '../../games/dress-the-tree/src/logic/rng';

const W = [1, 2, 3]; // kind 0 light, 1 medium, 2 heavy
const _ = EMPTY;

function board(hooks: number[][], extra: Partial<Board> = {}): Board {
  const branches = makeBranches(hooks.length / 2);
  return {
    branches, hooks, back: hooks.map(() => []), frozen: hooks.map(() => false), spare: [],
    weights: W, weightOn: true, limit: 100, ...extra,
  };
}

describe('dress-the-tree board', () => {
  it('lower branches are longer than upper ones', () => {
    const b = makeBranches(4);
    expect(b[0].dist[0]).toBeLessThan(b[7].dist[0]);
    expect(b.map((x) => x.side)).toEqual([-1, 1, -1, 1, -1, 1, -1, 1]);
  });

  it('torque = weight × distance × side', () => {
    // rows=2: row 0 dist 1..3, row 1 dist 2..4
    const b = board([[2, _, _], [_, _, 0], [_, _, _], [1, _, _]]);
    expect(torque(b)).toBe(-3 * 1 + 1 * 3 + 2 * 2);
  });

  it('three of a kind on a branch fly away and the tree straightens', () => {
    const b = board([[2, 2, _], [_, _, _], [2, 1, 1], [_, _, _]]);
    const r = applyMove(b, { from: { branch: 2, hook: 0 }, to: { branch: 0, hook: 2 } });
    expect(r.cleared).toEqual([0]);
    expect(r.board.hooks[0]).toEqual([_, _, _]);
    expect(torque(r.board)).toBe(-(2 * 3 + 2 * 4));
  });

  it('too much lean drops the star', () => {
    const b = board([[_, _, _], [_, _, _], [_, _, 2], [_, _, _]], { limit: 12 });
    expect(status(b)).toBe('playing'); // -3 × 4 = -12, exactly at the limit
    const r = applyMove(b, { from: { branch: 2, hook: 2 }, to: { branch: 3, hook: 2 } });
    expect(status(r.board)).toBe('playing');
    const heavy = board([[_, _, _], [_, _, _], [_, 2, 2], [_, _, _]], { limit: 12 });
    expect(status(heavy)).toBe('lost');
  });

  it('weight off: no lean, no loss', () => {
    const b = board([[_, _, _], [_, _, _], [2, 2, 1], [_, _, _]], { weightOn: false, limit: 0 });
    expect(status(b)).toBe('playing');
  });

  it('cannot move onto a taken hook, from an empty hook or to/from a frozen branch', () => {
    const b = board([[0, 1, _], [_, _, _], [_, _, _], [2, _, _]], { frozen: [false, false, false, true] });
    expect(canMove(b, { from: { branch: 0, hook: 0 }, to: { branch: 0, hook: 1 } })).toBe(false);
    expect(canMove(b, { from: { branch: 0, hook: 2 }, to: { branch: 1, hook: 0 } })).toBe(false);
    expect(canMove(b, { from: { branch: 0, hook: 0 }, to: { branch: 3, hook: 1 } })).toBe(false);
    expect(canMove(b, { from: { branch: 3, hook: 0 }, to: { branch: 1, hook: 1 } })).toBe(false);
    expect(canMove(b, { from: { branch: 0, hook: 0 }, to: { branch: 1, hook: 1 } })).toBe(true);
  });

  it('a cleared branch reveals the toys behind the needles', () => {
    const b = board([[0, 0, _], [0, _, _], [_, _, _], [_, _, _]]);
    b.back[0] = [[1, 2, 1]];
    const r = applyMove(b, { from: { branch: 1, hook: 0 }, to: { branch: 0, hook: 2 } });
    expect(r.revealed).toEqual([0]);
    expect(r.board.hooks[0]).toEqual([1, 2, 1]);
    expect(r.board.back[0]).toEqual([]);
    expect(b.back[0]).toEqual([[1, 2, 1]]); // original untouched
  });

  it('a triple thaws snowed-in neighbours only', () => {
    expect(neighbours(board(Array.from({ length: 6 }, () => [_, _, _])), 2).sort()).toEqual([0, 3, 4]);
    const b = board([[0, 0, _], [1, 2, 1], [0, _, _], [2, 1, 2]], { frozen: [false, true, false, true] });
    const r = applyMove(b, { from: { branch: 2, hook: 0 }, to: { branch: 0, hook: 2 } });
    expect(r.thawed).toEqual([1]); // same row; branch 3 is diagonal
    expect(r.board.frozen).toEqual([false, false, false, true]);
  });

  it('trunk hook has zero torque', () => {
    const b = addSpare(board([[_, _, _], [_, _, _], [_, _, 2], [_, _, _]]));
    const r = applyMove(b, { from: { branch: 2, hook: 2 }, to: { branch: -1, hook: 0 } });
    expect(torque(r.board)).toBe(0);
  });

  it('shuffle keeps the lean and never makes a ready triple', () => {
    const b = board([[0, 1, 0], [2, 0, 1], [1, 2, 0], [0, 1, 2]]);
    const r = rng(7);
    for (let i = 0; i < 50; i++) {
      const s = shuffleSameWeight(b, r.next);
      expect(torque(s)).toBe(torque(b));
      expect(s.hooks.some((h) => h[0] !== _ && h.every((k) => k === h[0]))).toBe(false);
    }
  });
});
