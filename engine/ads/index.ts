import type { Platform } from '../platform';

/**
 * Ad policy wrapper. On Yandex it enforces a minimum interval between interstitials
 * (Yandex also throttles on its side; we stay polite and never show ads mid-action).
 * On portals that pace ads themselves (platform.adsPacedByPlatform, Playgama Bridge) it adds no
 * timers: Playgama requires a request at every natural pause and lets Bridge decide.
 */
export class Ads {
  private lastInterstitial = 0;

  constructor(
    private platform: Platform,
    private hooks: { pause: () => void; resume: () => void },
    private minIntervalMs = 60_000,
  ) {}

  /** True when the game must ask for an interstitial at every natural pause (no own counters). */
  get atEveryPause(): boolean { return this.platform.adsPacedByPlatform; }

  /** Show rewarded buttons only when this is true. */
  get rewardedAvailable(): boolean { return this.platform.rewardedSupported; }

  /** Call only at natural pauses: level complete, game over, return to menu. */
  async interstitial(): Promise<void> {
    if (!this.platform.adsPacedByPlatform) {
      const now = Date.now();
      if (now - this.lastInterstitial < this.minIntervalMs) return;
      this.lastInterstitial = now;
    }
    await this.platform.showInterstitial({ onPause: this.hooks.pause, onResume: this.hooks.resume });
  }

  /** Rewarded: always by explicit player choice (a button with a clear reward). */
  rewarded(): Promise<boolean> {
    return this.platform.showRewarded({ onPause: this.hooks.pause, onResume: this.hooks.resume });
  }
}
