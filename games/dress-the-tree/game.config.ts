/**
 * Everything that makes this game different from its template lives here and in content/.
 * Code in src/ should read values from this config instead of hardcoding them.
 */
export const config = {
  id: 'dress-the-tree',
  /** Catalog title. Final titles go to release/ texts too. */
  title: { ru: 'Поймай круг', en: 'Catch the Circle' },
  orientation: 'portrait' as 'portrait' | 'landscape',
  width: 720,
  height: 1280,
  colors: { background: '#101826', accent: '#4dabf7', text: '#ffffff' },
  gameplay: {
    roundSeconds: 30,
    spawnEveryMs: 700,
    targetLifetimeMs: 1200,
  },
  ads: { interstitialMinIntervalMs: 60_000 },
};
export type GameConfig = typeof config;
