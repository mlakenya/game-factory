import type { Platform } from '../platform';

/**
 * Ad policy wrapper. Enforces a minimum interval between interstitials
 * (Yandex also throttles on its side; we stay polite and never show ads mid-action).
 */
export class Ads {
  private lastInterstitial = 0;

  constructor(
    private platform: Platform,
    private hooks: { pause: () => void; resume: () => void },
    private minIntervalMs = 60_000,
  ) {}

  /** Call only at natural pauses: level complete, game over, return to menu. */
  async interstitial(): Promise<void> {
    const now = Date.now();
    if (now - this.lastInterstitial < this.minIntervalMs) return;
    this.lastInterstitial = now;
    await this.platform.showInterstitial({ onPause: this.hooks.pause, onResume: this.hooks.resume });
  }

  /** Rewarded: always by explicit player choice (a button with a clear reward). */
  rewarded(): Promise<boolean> {
    return this.platform.showRewarded({ onPause: this.hooks.pause, onResume: this.hooks.resume });
  }
}
