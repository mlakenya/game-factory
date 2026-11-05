import { describe, expect, it } from 'vitest';
import { BARS } from '../../games/dress-the-tree/content/music';
import { noteHz } from '../../games/dress-the-tree/src/music';

describe('dress-the-tree music', () => {
  it('note names map to pitches', () => {
    expect(noteHz('A4')).toBeCloseTo(440);
    expect(noteHz('C4')).toBeCloseTo(261.63, 1);
    expect(noteHz('Bb4')).toBeCloseTo(466.16, 1);
  });
  it('every bar is a full waltz bar and every note is valid', () => {
    for (const bar of BARS) {
      expect(bar.melody.reduce((s, [, b]) => s + b, 0)).toBe(3);
      for (const n of [...bar.melody.map(([n]) => n), ...bar.chord]) expect(noteHz(n)).toBeGreaterThan(50);
    }
  });
});
