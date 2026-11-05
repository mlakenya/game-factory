import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../games/dress-the-tree/content/levels';
import { TOYS, TOY_WEIGHTS } from '../../games/dress-the-tree/content/toys';
import { applyMove, status } from '../../games/dress-the-tree/src/logic/board';
import { freeHooks, generate } from '../../games/dress-the-tree/src/logic/generator';
import { solve } from '../../games/dress-the-tree/src/logic/solver';

describe('dress-the-tree levels', () => {
  it('has 30 levels', () => expect(LEVELS).toHaveLength(30));

  it('is deterministic', () => {
    expect(generate(LEVELS[9], TOY_WEIGHTS)).toEqual(generate(LEVELS[9], TOY_WEIGHTS));
  });

  LEVELS.forEach((spec, i) => {
    it(`level ${i + 1} is winnable without boosters`, () => {
      expect(spec.kinds.every((k) => k >= 0 && k < TOYS.length)).toBe(true);
      expect(freeHooks(spec)).toBeGreaterThanOrEqual(2);
      const start = generate(spec, TOY_WEIGHTS);
      expect(status(start)).toBe('playing');
      const r = solve(start, 50_000);
      expect(r.solved, `level ${i + 1} seed ${spec.seed}: no solution (pick another seed)`).toBe(true);
      // Replay the found solution through the public rules.
      let b = start;
      for (const m of r.moves) {
        b = applyMove(b, m).board;
        expect(status(b)).not.toBe('lost');
      }
      expect(status(b)).toBe('won');
    });
  });
});
