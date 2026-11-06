import type { AdCallbacks, Lang, Platform } from './types';

/*
 * Playgama Bridge adapter: one build for Playgama and the portals it publishes to (CrazyGames, Poki,
 * VK, Yandex via Bridge, ...). The runtime is shipped inside the build as ./playgama-bridge.js
 * (see pipeline/targets.mjs), so the game never loads it from a CDN.
 * Docs: https://wiki.playgama.com/playgama/bridge-sdk/api
 */

/* Minimal typing of the Bridge parts we use (the npm package's own types pull in DOM-heavy internals). */
type Listener = (value: any) => void;
interface Bridge {
  initialize(options?: object): Promise<void>;
  on?(event: string, cb: Listener): void;
  EVENT_NAME: Record<'INTERSTITIAL_STATE_CHANGED' | 'REWARDED_STATE_CHANGED' | 'PAUSE_STATE_CHANGED' | 'AUDIO_STATE_CHANGED', string>;
  platform: {
    id: string;
    language: string;
    isAudioEnabled: boolean;
    sendMessage(message: string): Promise<unknown>;
    on(event: string, cb: Listener): void;
  };
  device: { type: string };
  advertisement: {
    isInterstitialSupported: boolean;
    isRewardedSupported: boolean;
    showInterstitial(placement?: string | null): void;
    showRewarded(placement?: string | null): void;
    on(event: string, cb: Listener): void;
  };
  storage: {
    get(key: string, tryParseJson?: boolean): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
  };
}
declare global {
  interface Window { bridge?: Bridge }
}

/** How long an ad may stay in "loading" before we give up and resume the game. */
const AD_LOADING_TIMEOUT_MS = 10_000;

export class PlaygamaPlatform implements Platform {
  readonly name = 'playgama' as const;
  readonly lang: Lang;
  readonly device: Platform['device'];
  readonly adsPacedByPlatform = true;
  private pauseListeners: Array<(p: boolean) => void> = [];
  private audioListeners: Array<(enabled: boolean) => void> = [];
  private gameplayActive = false;
  /** Resolves the ad currently on screen; only one ad at a time. */
  private onInterstitial?: (state: string) => void;
  private onRewarded?: (state: string) => void;

  private constructor(private bridge: Bridge, private storageKey: string) {
    this.lang = bridge.platform.language || 'en';
    const type = bridge.device?.type;
    this.device = type === 'mobile' || type === 'tablet' || type === 'tv' ? type : 'desktop';
    const ev = bridge.EVENT_NAME;
    bridge.platform.on(ev.PAUSE_STATE_CHANGED, (paused: boolean) => this.emitPause(!!paused));
    bridge.platform.on(ev.AUDIO_STATE_CHANGED, (enabled: boolean) => this.audioListeners.forEach((l) => l(!!enabled)));
    bridge.advertisement.on(ev.INTERSTITIAL_STATE_CHANGED, (s: string) => this.onInterstitial?.(s));
    bridge.advertisement.on(ev.REWARDED_STATE_CHANGED, (s: string) => this.onRewarded?.(s));
    document.addEventListener('visibilitychange', () => this.emitPause(document.hidden));
  }

  /**
   * Returns null when the Bridge runtime is not on the page (Yandex-target build) or fails to start.
   * Bridge paces interstitials itself (first-ad delay, interval from playgama-bridge-config.json),
   * so engine/ads asks for one at every natural pause on this platform.
   */
  static async create(opts: { storageKey?: string } = {}): Promise<PlaygamaPlatform | null> {
    const bridge = window.bridge;
    if (!bridge) return null;
    try {
      await bridge.initialize();
      return new PlaygamaPlatform(bridge, opts.storageKey ?? 'game-factory-save');
    } catch {
      return null;
    }
  }

  get rewardedSupported(): boolean { return this.bridge.advertisement.isRewardedSupported; }

  /** Bridge platform id: 'playgama', 'yandex', 'crazy_games', ... ('mock' outside any portal). */
  get portal(): string { return this.bridge.platform.id; }

  gameReady() { void this.bridge.platform.sendMessage('game_ready'); }

  gameplayStart() {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    void this.bridge.platform.sendMessage('gameplay_started');
  }

  gameplayStop() {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    void this.bridge.platform.sendMessage('gameplay_stopped');
  }

  showInterstitial(cb?: AdCallbacks): Promise<void> {
    if (!this.bridge.advertisement.isInterstitialSupported) return Promise.resolve();
    return this.runAd('interstitial', cb).then(() => undefined);
  }

  showRewarded(cb?: AdCallbacks): Promise<boolean> {
    if (!this.bridge.advertisement.isRewardedSupported) return Promise.resolve(false);
    return this.runAd('rewarded', cb);
  }

  /**
   * Drives one ad through Bridge states: loading → opened → (rewarded) → closed | failed.
   * Resolves true only if the "rewarded" state was reached (reward is never granted on close alone).
   */
  private runAd(kind: 'interstitial' | 'rewarded', cb?: AdCallbacks): Promise<boolean> {
    return new Promise((resolve) => {
      const wasActive = this.gameplayActive;
      let opened = false;
      let rewarded = false;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(loadingTimer);
        if (kind === 'interstitial') this.onInterstitial = undefined;
        else this.onRewarded = undefined;
        if (opened) cb?.onResume?.();
        if (opened && wasActive) this.gameplayStart();
        resolve(rewarded);
      };
      const loadingTimer = setTimeout(() => { if (!opened) finish(); }, AD_LOADING_TIMEOUT_MS);
      const handler = (state: string) => {
        if (state === 'opened' && !opened) {
          opened = true;
          this.gameplayStop();
          cb?.onPause?.();
        } else if (state === 'rewarded') rewarded = true;
        else if (state === 'closed' || state === 'failed') finish();
      };
      if (kind === 'interstitial') {
        this.onInterstitial = handler;
        this.bridge.advertisement.showInterstitial();
      } else {
        this.onRewarded = handler;
        this.bridge.advertisement.showRewarded();
      }
    });
  }

  async loadData<T extends object>(): Promise<Partial<T>> {
    try {
      const v = await this.bridge.storage.get(this.storageKey, true);
      if (typeof v === 'string') return JSON.parse(v);
      return v && typeof v === 'object' ? (v as Partial<T>) : {};
    } catch {
      return {};
    }
  }

  async saveData<T extends object>(data: T) {
    try { await this.bridge.storage.set(this.storageKey, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }

  onPauseChange(listener: (paused: boolean) => void) { this.pauseListeners.push(listener); }

  onAudioChange(listener: (enabled: boolean) => void) {
    this.audioListeners.push(listener);
    if (!this.bridge.platform.isAudioEnabled) listener(false);
  }

  private emitPause(p: boolean) { this.pauseListeners.forEach((l) => l(p)); }
}
