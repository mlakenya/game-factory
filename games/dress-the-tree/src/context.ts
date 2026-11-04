import type { Ads } from '@engine/ads';
import type { AudioGate } from '@engine/audio';
import type { createI18n } from '@engine/i18n';
import type { Platform } from '@engine/platform';
import type { SaveStore } from '@engine/save';
import type { GameConfig } from '../game.config';

export interface SaveData {
  best: number;
  muted: boolean;
}

/** Shared services, passed to every scene via the registry key 'ctx'. */
export interface GameContext {
  config: GameConfig;
  platform: Platform;
  t: ReturnType<typeof createI18n>;
  save: SaveStore<SaveData>;
  ads: Ads;
  audio: AudioGate;
}

export const CTX = 'ctx';
