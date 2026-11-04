import type { Ads } from '@engine/ads';
import type { AudioGate } from '@engine/audio';
import type { createI18n } from '@engine/i18n';
import type { Platform } from '@engine/platform';
import type { SaveStore } from '@engine/save';
import type { GameConfig } from '../game.config';
import type { Sfx } from './sfx';

export interface SaveData {
  /** Highest level the player may open (1-based). */
  unlocked: number;
  /** Best stars per level, index = level - 1. */
  stars: number[];
  /** Hints already shown: 'basic' | 'weight' | 'hidden' | 'frozen'. */
  hints: string[];
  muted: boolean;
}

export const DEFAULT_SAVE: SaveData = { unlocked: 1, stars: [], hints: [], muted: false };

/** Shared services, passed to every scene via the registry key 'ctx'. */
export interface GameContext {
  config: GameConfig;
  platform: Platform;
  t: ReturnType<typeof createI18n>;
  save: SaveStore<SaveData>;
  ads: Ads;
  audio: AudioGate;
  sfx: Sfx;
}

export const CTX = 'ctx';

/** Font used everywhere: system fonts only (no external font files). */
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
