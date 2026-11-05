import type { AdCallbacks, Lang, Platform } from './types';

/* Minimal typing of Yandex Games SDK v2 parts we use. Docs: https://yandex.ru/dev/games/doc/ru/sdk/sdk-about */
interface YSDK {
  environment: { i18n: { lang: string } };
  deviceInfo: { type: 'desktop' | 'mobile' | 'tablet' | 'tv' };
  features: {
    LoadingAPI?: { ready(): void };
    GameplayAPI?: { start(): void; stop(): void };
  };
  adv: {
    showFullscreenAdv(o: { callbacks: Record<string, (...a: any[]) => void> }): void;
    showRewardedVideo(o: { callbacks: Record<string, (...a: any[]) => void> }): void;
  };
  getPlayer(o?: { scopes?: boolean }): Promise<{ getData(): Promise<object>; setData(d: object, flush?: boolean): Promise<void> }>;
  on(event: 'game_api_pause' | 'game_api_resume', cb: () => void): void;
}
declare global {
  interface Window { YaGames?: { init(): Promise<YSDK> } }
}

export class YandexPlatform implements Platform {
  readonly name = 'yandex' as const;
  readonly lang: Lang;
  readonly device: Platform['device'];
  readonly adsPacedByPlatform = false;
  readonly rewardedSupported = true;
  private player?: Awaited<ReturnType<YSDK['getPlayer']>>;
  private listeners: Array<(p: boolean) => void> = [];
  private gameplayActive = false;

  private constructor(private sdk: YSDK) {
    this.lang = sdk.environment.i18n.lang;
    this.device = sdk.deviceInfo?.type ?? 'desktop';
    sdk.on('game_api_pause', () => this.emit(true));
    sdk.on('game_api_resume', () => this.emit(false));
    document.addEventListener('visibilitychange', () => this.emit(document.hidden));
  }

  static async create(): Promise<YandexPlatform | null> {
    if (!window.YaGames) return null;
    try {
      const sdk = await window.YaGames.init();
      return new YandexPlatform(sdk);
    } catch {
      return null;
    }
  }

  gameReady() { this.sdk.features.LoadingAPI?.ready(); }

  gameplayStart() {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    this.sdk.features.GameplayAPI?.start();
  }

  gameplayStop() {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    this.sdk.features.GameplayAPI?.stop();
  }

  showInterstitial(cb?: AdCallbacks): Promise<void> {
    return new Promise((resolve) => {
      const wasActive = this.gameplayActive;
      const done = () => { cb?.onResume?.(); if (wasActive) this.gameplayStart(); resolve(); };
      this.sdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => { this.gameplayStop(); cb?.onPause?.(); },
          onClose: () => done(),
          onError: () => done(),
          onOffline: () => done(),
        },
      });
    });
  }

  showRewarded(cb?: AdCallbacks): Promise<boolean> {
    return new Promise((resolve) => {
      let rewarded = false;
      const wasActive = this.gameplayActive;
      this.sdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => { this.gameplayStop(); cb?.onPause?.(); },
          onRewarded: () => { rewarded = true; },
          onClose: () => { cb?.onResume?.(); if (wasActive) this.gameplayStart(); resolve(rewarded); },
          onError: () => { cb?.onResume?.(); if (wasActive) this.gameplayStart(); resolve(false); },
        },
      });
    });
  }

  private async getPlayer() {
    this.player ??= await this.sdk.getPlayer({ scopes: false });
    return this.player;
  }

  async loadData<T extends object>(): Promise<Partial<T>> {
    try { return (await (await this.getPlayer()).getData()) as Partial<T>; } catch { return {}; }
  }

  async saveData<T extends object>(data: T) {
    try { await (await this.getPlayer()).setData(data); } catch { /* ignore, retry on next save */ }
  }

  onPauseChange(listener: (paused: boolean) => void) { this.listeners.push(listener); }
  onAudioChange(_listener: (enabled: boolean) => void) { /* no portal mute on this platform */ }
  private emit(p: boolean) { this.listeners.forEach((l) => l(p)); }
}
