import type { AdCallbacks, Lang, Platform } from './types';

const STORAGE_KEY = 'game-factory-save';

/** Local platform used in dev, Playwright tests and when the Yandex SDK is absent. */
export class MockPlatform implements Platform {
  readonly name = 'mock' as const;
  readonly lang: Lang;
  readonly device: Platform['device'];
  readonly adsPacedByPlatform = false;
  /** ?rewarded=0 hides rewarded buttons, as on portals without them (CrazyGames preview video). */
  readonly rewardedSupported: boolean;
  /** Exposed for tests: counts of lifecycle calls. */
  readonly calls = { ready: 0, start: 0, stop: 0, interstitial: 0, rewarded: 0 };
  private listeners: Array<(p: boolean) => void> = [];

  constructor(opts: { lang?: Lang; storageKey?: string } = {}) {
    const urlLang = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
    this.lang = opts.lang ?? urlLang ?? 'ru';
    this.rewardedSupported = typeof location === 'undefined' || new URLSearchParams(location.search).get('rewarded') !== '0';
    this.device = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
    this.storageKey = opts.storageKey ?? STORAGE_KEY;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.emit(document.hidden));
    }
  }
  private storageKey: string;

  gameReady() { this.calls.ready++; }
  gameplayStart() { this.calls.start++; }
  gameplayStop() { this.calls.stop++; }

  async showInterstitial(cb?: AdCallbacks) {
    this.calls.interstitial++;
    cb?.onPause?.();
    await new Promise((r) => setTimeout(r, 50));
    cb?.onResume?.();
  }

  async showRewarded(cb?: AdCallbacks) {
    this.calls.rewarded++;
    cb?.onPause?.();
    await new Promise((r) => setTimeout(r, 50));
    cb?.onResume?.();
    return true;
  }

  async loadData<T extends object>(): Promise<Partial<T>> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? '{}');
    } catch {
      return {};
    }
  }

  async saveData<T extends object>(data: T) {
    try { localStorage.setItem(this.storageKey, JSON.stringify(data)); } catch { /* private mode */ }
  }

  onPauseChange(listener: (paused: boolean) => void) { this.listeners.push(listener); }
  onAudioChange(_listener: (enabled: boolean) => void) { /* no portal mute on this platform */ }
  private emit(p: boolean) { this.listeners.forEach((l) => l(p)); }
}
