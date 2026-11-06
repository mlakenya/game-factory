import type { AdCallbacks, Lang, Platform } from './types';

/*
 * CrazyGames HTML5 SDK v3 adapter. Docs: https://docs.crazygames.com/sdk/intro/
 * The SDK must come from CrazyGames' own URL (like Yandex /sdk.js), so it is the one external script
 * a crazygames build loads. It is injected here at startup, not with a static <script> tag, so that
 * ?mock runs and tests never touch the network.
 */
export const CRAZYGAMES_SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

/** Minimal typing of the SDK v3 parts we use. */
interface CgAdError { code?: string; message?: string }
interface CgSettings { muteAudio?: boolean; disableChat?: boolean }
export interface CrazySdk {
  init(): Promise<void>;
  /** 'local' (localhost, demo ads), 'crazygames' (live site) or 'disabled' (any other domain: calls throw). */
  environment: 'local' | 'crazygames' | 'disabled' | string;
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    settings: CgSettings;
    addSettingsChangeListener(fn: (s: CgSettings) => void): void;
  };
  ad: {
    requestAd(type: 'midgame' | 'rewarded', cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: CgAdError) => void }): void;
  };
  user?: { systemInfo?: { locale?: string; countryCode?: string; device?: { type?: string } } };
  /** Same API as localStorage, synchronous. Works only if "Progress Save → Data Module" is chosen at submission. */
  data: { getItem(key: string): string | null; setItem(key: string, value: string): void };
}
declare global {
  interface Window { CrazyGames?: { SDK: CrazySdk } }
}

/** Give up on the SDK script after this long and run on the mock (blocked CDN, offline). */
const SDK_LOAD_TIMEOUT_MS = 8_000;
/** An ad that never reports adStarted/adError within this time is treated as failed. */
const AD_START_TIMEOUT_MS = 15_000;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    const timer = setTimeout(() => reject(new Error('timeout')), SDK_LOAD_TIMEOUT_MS);
    s.addEventListener('load', () => clearTimeout(timer));
    document.head.appendChild(s);
  });
}

/** 'ru-RU' → 'ru'. English when the SDK gives nothing (CrazyGames requires the English fallback). */
export function langFromLocale(locale: string | undefined): Lang {
  const l = (locale ?? '').toLowerCase().split(/[-_]/)[0];
  return l || 'en';
}

export class CrazyGamesPlatform implements Platform {
  readonly name = 'crazygames' as const;
  readonly lang: Lang;
  readonly device: Platform['device'];
  /** The SDK paces midgame ads itself (at most one per 3 minutes, early requests are dropped). */
  readonly adsPacedByPlatform = true;
  /**
   * Rewarded buttons are hidden on CrazyGames for now: Basic Launch has ads disabled (a rewarded button
   * that does nothing is a reject), and CrazyGames forbids rewarded buttons on the active gameplay
   * screen and revive offers on every death. Revisit at Full Launch, see platform-sdk skill.
   */
  readonly rewardedSupported = false;
  private pauseListeners: Array<(p: boolean) => void> = [];
  private audioListeners: Array<(enabled: boolean) => void> = [];
  private gameplayActive = false;
  /** Set after an adsDisabled error (Basic Launch, kids site): no more requests this session. */
  private adsOff = false;
  private pendingAd?: Promise<boolean>;

  private constructor(private sdk: CrazySdk, private storageKey: string) {
    const info = sdk.user?.systemInfo;
    this.lang = langFromLocale(info?.locale);
    const type = info?.device?.type;
    this.device = type === 'mobile' || type === 'tablet' ? type : 'desktop';
    sdk.game.addSettingsChangeListener((s) => this.emitAudio(!s.muteAudio));
    document.addEventListener('visibilitychange', () => this.pauseListeners.forEach((l) => l(document.hidden)));
  }

  /**
   * Loads and initializes the SDK. Returns null when it can't be loaded or the domain is not CrazyGames
   * (environment 'disabled', where every SDK call throws): the game then runs on the mock.
   */
  static async create(opts: { storageKey?: string; sdkUrl?: string } = {}): Promise<CrazyGamesPlatform | null> {
    try {
      if (!window.CrazyGames?.SDK) await loadScript(opts.sdkUrl ?? CRAZYGAMES_SDK_URL);
      const sdk = window.CrazyGames?.SDK;
      if (!sdk) return null;
      await sdk.init();
      if (sdk.environment !== 'crazygames' && sdk.environment !== 'local') return null;
      const p = new CrazyGamesPlatform(sdk, opts.storageKey ?? 'game-factory-save');
      sdk.game.loadingStart();
      return p;
    } catch {
      return null;
    }
  }

  /** Loading ends when the game is playable; the first gameplayStart ends the "initial download". */
  gameReady() { this.call(() => this.sdk.game.loadingStop()); }

  gameplayStart() {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    this.call(() => this.sdk.game.gameplayStart());
  }

  gameplayStop() {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    this.call(() => this.sdk.game.gameplayStop());
  }

  showInterstitial(cb?: AdCallbacks): Promise<void> {
    return this.runAd('midgame', cb).then(() => undefined);
  }

  showRewarded(cb?: AdCallbacks): Promise<boolean> {
    return this.runAd('rewarded', cb);
  }

  /**
   * One ad at a time; a second request while one runs gets the same promise (double taps on "Next").
   * Game audio is muted only from adStarted, not at the request (CrazyGames rule). The promise resolves
   * after adFinished or adError, so the caller keeps its UI blocked until then. Reward only on adFinished.
   */
  private runAd(type: 'midgame' | 'rewarded', cb?: AdCallbacks): Promise<boolean> {
    if (this.adsOff) return Promise.resolve(false);
    if (this.pendingAd) return this.pendingAd;
    this.pendingAd = new Promise<boolean>((resolve) => {
      const wasActive = this.gameplayActive;
      let started = false;
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.pendingAd = undefined;
        if (started) {
          cb?.onResume?.();
          if (wasActive) this.gameplayStart();
        }
        resolve(ok);
      };
      const timer = setTimeout(() => { if (!started) finish(false); }, AD_START_TIMEOUT_MS);
      try {
        this.sdk.ad.requestAd(type, {
          adStarted: () => {
            if (started || done) return;
            started = true;
            clearTimeout(timer);
            this.gameplayStop();
            cb?.onPause?.();
          },
          adFinished: () => finish(true),
          adError: (e) => {
            if (e?.code === 'adsDisabled') this.adsOff = true;
            finish(false);
          },
        });
      } catch {
        finish(false);
      }
    });
    return this.pendingAd;
  }

  /** Data module first; localStorage when it is off (not selected at submission) or throws. */
  async loadData<T extends object>(): Promise<Partial<T>> {
    for (const read of [() => this.sdk.data.getItem(this.storageKey), () => localStorage.getItem(this.storageKey)]) {
      try {
        const raw = read();
        if (raw) return JSON.parse(raw);
      } catch { /* try the next store */ }
    }
    return {};
  }

  async saveData<T extends object>(data: T) {
    const raw = JSON.stringify(data);
    try { this.sdk.data.setItem(this.storageKey, raw); return; } catch { /* data module off */ }
    try { localStorage.setItem(this.storageKey, raw); } catch { /* private mode */ }
  }

  onPauseChange(listener: (paused: boolean) => void) { this.pauseListeners.push(listener); }

  /** settings.muteAudio overrides the game's own sound toggles, also right at startup. */
  onAudioChange(listener: (enabled: boolean) => void) {
    this.audioListeners.push(listener);
    if (this.sdk.game.settings?.muteAudio) listener(false);
  }

  private emitAudio(enabled: boolean) { this.audioListeners.forEach((l) => l(enabled)); }

  private call(fn: () => void) { try { fn(); } catch { /* SDK unavailable: never break the game */ } }
}
