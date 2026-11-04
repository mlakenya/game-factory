import { describe, expect, it } from 'vitest';
import { daysToNewYear, interstitialAfterWin, recordWin, ruPlural, starsFor } from '../../games/dress-the-tree/src/logic/progress';

describe('dress-the-tree progress', () => {
  it('stars from max lean', () => {
    expect(starsFor(0.9, false, [0.6, 0.85])).toBe(3);
    expect(starsFor(0.5, true, [0.6, 0.85])).toBe(3);
    expect(starsFor(0.7, true, [0.6, 0.85])).toBe(2);
    expect(starsFor(0.99, true, [0.6, 0.85])).toBe(1);
  });
  it('win keeps best stars and unlocks next', () => {
    expect(recordWin([3, 1], 2, 2, 2, 30)).toMatchObject({ unlocked: 3 });
    expect(recordWin([3, 1], 2, 2, 2, 30).stars.slice(0, 2)).toEqual([3, 2]);
    expect(recordWin([3, 3], 5, 1, 1, 30).unlocked).toBe(5);
    expect(recordWin([3, 3], 5, 1, 1, 30).stars[0]).toBe(3);
    expect(recordWin([], 30, 30, 3, 30).unlocked).toBe(30);
  });
  it('interstitial every other level from level 3', () => {
    expect([1, 2, 3, 4, 5, 6, 7].filter((l) => interstitialAfterWin(l, 3, 2))).toEqual([3, 5, 7]);
  });
  it('New Year countdown', () => {
    expect(daysToNewYear(new Date(2026, 10, 4, 23, 30))).toBe(58);
    expect(daysToNewYear(new Date(2026, 11, 31))).toBe(1);
    expect(daysToNewYear(new Date(2027, 0, 3))).toBeNull();
    expect(daysToNewYear(new Date(2027, 0, 20))).toBe(346);
  });
  it('russian plurals', () => {
    expect([1, 2, 5, 11, 21, 22, 25, 58].map(ruPlural)).toEqual([0, 1, 2, 2, 0, 1, 2, 2]);
  });
});
