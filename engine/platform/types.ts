/**
 * Platform abstraction. Games talk ONLY to this interface, never to window.YaGames directly.
 * Implementations: yandex.ts (Yandex Games SDK v2), mock.ts (local dev, tests).
 * Later: playgama.ts (Playgama Bridge for CrazyGames, VK Play, etc.).
 */
export type Lang = 'ru' | 'en' | (string & {});

export interface AdCallbacks {
  /** Called right before an ad opens: pause the game and mute audio. */
  onPause?: () => void;
  /** Called after the ad closes (or failed): resume game and audio. */
  onResume?: () => void;
}

export interface Platform {
  readonly name: 'yandex' | 'mock';
  /** Language detected by the platform (Yandex: environment.i18n.lang). */
  readonly lang: Lang;
  /** Device type, if known. */
  readonly device: 'desktop' | 'mobile' | 'tablet' | 'tv';

  /** Call once when the game is fully loaded and playable (Yandex LoadingAPI.ready). */
  gameReady(): void;
  /** Call when active gameplay starts / resumes (Yandex GameplayAPI.start). */
  gameplayStart(): void;
  /** Call when gameplay stops: menus, pause, level end, ads (Yandex GameplayAPI.stop). */
  gameplayStop(): void;

  /** Fullscreen interstitial. Only at natural pauses (between levels). Resolves when closed. */
  showInterstitial(cb?: AdCallbacks): Promise<void>;
  /** Rewarded video. Resolves true if the reward must be granted. */
  showRewarded(cb?: AdCallbacks): Promise<boolean>;

  /** Cloud save (Yandex player data). Falls back to localStorage. */
  loadData<T extends object>(): Promise<Partial<T>>;
  saveData<T extends object>(data: T): Promise<void>;

  /** Platform-driven pause (Yandex game_api_pause / game_api_resume, tab hidden). */
  onPauseChange(listener: (paused: boolean) => void): void;
}
