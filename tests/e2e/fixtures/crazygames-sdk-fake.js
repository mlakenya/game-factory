// Stand-in for https://sdk.crazygames.com/crazygames-sdk-v3.js in e2e tests (the real one needs the network).
// Mirrors the v3 surface engine/platform/crazygames.ts uses and records every call in window.__cg.
(() => {
  const q = new URLSearchParams(location.search);
  const log = [];
  const listeners = [];
  const settings = { muteAudio: q.get('muteAudio') === 'true', disableChat: false };
  window.__cg = { log, settings, setMute: (m) => { settings.muteAudio = m; listeners.forEach((l) => l({ ...settings })); } };
  window.CrazyGames = {
    SDK: {
      environment: 'crazygames',
      init: async () => { log.push('init'); },
      game: {
        gameplayStart: () => log.push('gameplayStart'),
        gameplayStop: () => log.push('gameplayStop'),
        loadingStart: () => log.push('loadingStart'),
        loadingStop: () => log.push('loadingStop'),
        settings,
        addSettingsChangeListener: (fn) => listeners.push(fn),
      },
      ad: {
        requestAd: (type, cb) => {
          log.push(`ad:${type}`);
          setTimeout(() => cb.adError?.({ code: 'adsDisabled', message: 'Basic Launch' }), 50);
        },
      },
      user: { systemInfo: { locale: q.get('cgLocale') || 'en-US', countryCode: 'US', device: { type: 'desktop' } } },
      data: {
        getItem: (k) => localStorage.getItem(`cg-data:${k}`),
        setItem: (k, v) => { log.push('data:set'); localStorage.setItem(`cg-data:${k}`, v); },
      },
    },
  };
})();
