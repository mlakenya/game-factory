/**
 * Platform abstraction. Games talk ONLY to this interface, never to window.YaGames directly.
 * Implementations: yandex.ts (Yandex Games SDK v2), playgama.ts (Playgama Bridge: Playgama, CrazyGames,
 * VK and other portals), mock.ts (local dev, tests). Which one a build gets is set by the build target.
 */
export type Lang = 'ru' | 'en' | (string & {});

export interface AdCallbacks {
  /** Called right before an ad opens: pause the game and mute audio. */
  onPause?: () => void;
  /** Called after the ad closes (or failed): resume game and audio. */
  onResume?: () => void;
}

export interface Platform {
  readonly name: 'yandex' | 'playgama' | 'mock';
  /** Language detected by the platform (Yandex: environment.i18n.lang). */
  readonly lang: Lang;
  /** Device type, if known. */
  readonly device: 'desktop' | 'mobile' | 'tablet' | 'tv';
  /**
   * True when the portal itself decides when an interstitial is really shown (Playgama Bridge:
   * first-ad delay and interval). Then the game asks for one at EVERY natural pause, with no own
   * timers or counters. False: the game paces interstitials itself (Yandex).
   */
  readonly adsPacedByPlatform: boolean;
  /** Rewarded ads available here. When false, rewarded buttons must be hidden, not shown broken. */
  readonly rewardedSupported: boolean;

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
  /**
   * Portal-driven mute (Playgama Bridge audio_state_changed). Called with false when the portal
   * asks the game to be silent, true when sound may play again. Yandex and mock never call it.
   */
  onAudioChange(listener: (enabled: boolean) => void): void;
}
