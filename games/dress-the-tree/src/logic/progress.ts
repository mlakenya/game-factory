/** Progress rules that do not need Phaser: stars, unlocking, ad schedule, New Year countdown. */

/** Stars for a won level from the largest lean reached (|tilt| as a fraction of the limit). */
export function starsFor(maxTilt: number, weightOn: boolean, thresholds: readonly [number, number]): 1 | 2 | 3 {
  if (!weightOn || maxTilt <= thresholds[0]) return 3;
  return maxTilt <= thresholds[1] ? 2 : 1;
}

/** Records a win: keeps the best stars, unlocks the next level. Returns new arrays. */
export function recordWin(stars: number[], unlocked: number, level: number, got: number, total: number) {
  const next = [...stars];
  while (next.length < total) next.push(0);
  next[level - 1] = Math.max(next[level - 1] ?? 0, got);
  return { stars: next, unlocked: Math.min(total, Math.max(unlocked, level + 1)) };
}

/** Interstitial after a win: from level `from`, on every `every`-th level. Never after a loss. */
export function interstitialAfterWin(level: number, from: number, every: number) {
  return level >= from && (level - from) % every === 0;
}

/** Days until 1 January; null during the holidays (1–14 January) — show a greeting instead. */
export function daysToNewYear(now: Date): number | null {
  if (now.getMonth() === 0 && now.getDate() <= 14) return null;
  const ny = new Date(now.getFullYear() + 1, 0, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((ny.getTime() - today.getTime()) / 86_400_000);
}

/** Russian plural form index for «день/дня/дней»: 0 one, 1 few, 2 many. */
export function ruPlural(n: number): 0 | 1 | 2 {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 0;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
  return 2;
}
