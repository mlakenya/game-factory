/**
 * Everything that makes this game different from its template lives here and in content/.
 * Code in src/ should read values from this config instead of hardcoding them.
 */
export const config = {
  id: 'dress-the-tree',
  /** Catalog title. Final titles go to release/ texts too. */
  title: { ru: 'Наряди ёлку', en: 'Dress the Tree' },
  orientation: 'portrait' as 'portrait' | 'landscape',
  width: 720,
  height: 1280,
  colors: {
    background: '#0b1d3a',
    backgroundTop: 0x0b1d3a,
    backgroundBottom: 0x1d3f6e,
    accent: '#ffd43b',
    text: '#ffffff',
    textDim: '#a5b4d4',
    button: '#c92a2a',
    buttonAlt: '#2b4a7a',
    buttonAd: '#2f9e44',
    needles: 0x1f7a3a,
    needlesDark: 0x145a2a,
    trunk: 0x6b3f1d,
    snow: 0xeef6ff,
  },
  gameplay: {
    /** Tree rotation in degrees when the lean is exactly at the limit. */
    maxAngleDeg: 9,
    /** Lean (fraction of the limit) from which the tree creaks and the meter turns red. */
    dangerTilt: 0.75,
    /** Max lean for 3 and 2 stars. */
    starThresholds: [0.6, 0.85] as const,
    /** Trunk hooks a player can add per level via rewarded ads. */
    maxSpare: 2,
    /** Drag distance (px) that turns a tap into a drag; drop radius around a hook. */
    dragThreshold: 14,
    dropRadius: 80,
  },
  ads: {
    interstitialMinIntervalMs: 60_000,
    /** Interstitial after a win, starting at this level, every N levels. */
    interstitialFromLevel: 3,
    interstitialEvery: 2,
  },
};
export type GameConfig = typeof config;
