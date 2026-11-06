import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ads } from '../../engine/ads';
import { CrazyGamesPlatform, langFromLocale } from '../../engine/platform/crazygames';

type AdCb = { adStarted?: () => void; adFinished?: () => void; adError?: (e: { code: string }) => void };

/** Fake CrazyGames SDK v3: records calls, lets the test drive ad callbacks and settings. */
function fakeSdk(opts: { env?: string; locale?: string; device?: string; muteAudio?: boolean; dataOff?: boolean } = {}) {
  const calls: string[] = [];
  const ads: Array<{ type: string; cb: AdCb }> = [];
  const store: Record<string, string> = {};
  let settingsListener: ((s: { muteAudio?: boolean }) => void) | undefined;
  const sdk = {
    init: vi.fn(async () => undefined),
    environment: opts.env ?? 'crazygames',
    game: {
      gameplayStart: () => calls.push('gameplayStart'),
      gameplayStop: () => calls.push('gameplayStop'),
      loadingStart: () => calls.push('loadingStart'),
      loadingStop: () => calls.push('loadingStop'),
      settings: { muteAudio: opts.muteAudio ?? false, disableChat: false },
      addSettingsChangeListener: (fn: typeof settingsListener) => { settingsListener = fn; },
    },
    ad: { requestAd: (type: string, cb: AdCb) => { ads.push({ type, cb }); } },
    user: { systemInfo: { locale: opts.locale ?? 'ru-RU', countryCode: 'RU', device: { type: opts.device ?? 'mobile' } } },
    data: {
      getItem: (k: string) => { if (opts.dataOff) throw new Error('dataModuleDisabled'); return store[k] ?? null; },
      setItem: (k: string, v: string) => { if (opts.dataOff) throw new Error('dataModuleDisabled'); store[k] = v; },
    },
  };
  return { sdk, calls, ads, store, setSettings: (s: { muteAudio?: boolean }) => settingsListener?.(s) };
}

describe('CrazyGamesPlatform', () => {
  const local: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal('document', { hidden: false, addEventListener: () => undefined });
    vi.stubGlobal('localStorage', { getItem: (k: string) => local[k] ?? null, setItem: (k: string, v: string) => { local[k] = v; } });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); for (const k in local) delete local[k]; });

  async function make(opts?: Parameters<typeof fakeSdk>[0]) {
    const f = fakeSdk(opts);
    vi.stubGlobal('window', { CrazyGames: { SDK: f.sdk } });
    const p = (await CrazyGamesPlatform.create({ storageKey: 'gf-test' }))!;
    return { p, ...f };
  }

  it('maps the SDK locale to a game language with English fallback', () => {
    expect(langFromLocale('ru-RU')).toBe('ru');
    expect(langFromLocale('en_US')).toBe('en');
    expect(langFromLocale('DE')).toBe('de');
    expect(langFromLocale(undefined)).toBe('en');
    expect(langFromLocale('')).toBe('en');
  });

  it('runs on the mock outside CrazyGames domains (environment disabled)', async () => {
    const f = fakeSdk({ env: 'disabled' });
    vi.stubGlobal('window', { CrazyGames: { SDK: f.sdk } });
    expect(await CrazyGamesPlatform.create()).toBeNull();
  });

  it('takes language and device from systemInfo, reports loading and gameplay once each', async () => {
    const { p, calls, sdk } = await make();
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(p.lang).toBe('ru');
    expect(p.device).toBe('mobile');
    expect(p.rewardedSupported).toBe(false);
    expect(p.adsPacedByPlatform).toBe(true);
    p.gameReady();
    p.gameplayStart(); p.gameplayStart();
    p.gameplayStop(); p.gameplayStop();
    expect(calls).toEqual(['loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop']);
  });

  it('mutes only once the ad really starts and resumes gameplay after it', async () => {
    const { p, ads, calls } = await make();
    p.gameplayStart();
    const pause = vi.fn(); const resume = vi.fn();
    const r = p.showInterstitial({ onPause: pause, onResume: resume });
    expect(ads[0].type).toBe('midgame');
    expect(pause).not.toHaveBeenCalled(); // requested, not playing yet
    ads[0].cb.adStarted!();
    expect(pause).toHaveBeenCalledOnce();
    ads[0].cb.adFinished!();
    await r;
    expect(resume).toHaveBeenCalledOnce();
    expect(calls.slice(1)).toEqual(['gameplayStart', 'gameplayStop', 'gameplayStart']);
  });

  it('a second request while an ad runs gets the same ad, not a new one', async () => {
    const { p, ads } = await make();
    const a = p.showInterstitial();
    const b = p.showInterstitial();
    expect(ads).toHaveLength(1);
    ads[0].cb.adError!({ code: 'unfilled' });
    await Promise.all([a, b]);
  });

  it('grants a reward only on adFinished; adError gives nothing and does not pause', async () => {
    const { p, ads } = await make();
    const pause = vi.fn();
    const ok = p.showRewarded({ onPause: pause });
    ads[0].cb.adStarted!(); ads[0].cb.adFinished!();
    expect(await ok).toBe(true);
    const fail = p.showRewarded({ onPause: pause });
    ads[1].cb.adError!({ code: 'unfilled' });
    expect(await fail).toBe(false);
    expect(pause).toHaveBeenCalledOnce();
  });

  it('stops asking for ads after adsDisabled (Basic Launch)', async () => {
    const { p, ads } = await make();
    const ads1 = new Ads(p, { pause: () => undefined, resume: () => undefined });
    expect(ads1.atEveryPause).toBe(true);
    const r = ads1.interstitial();
    ads[0].cb.adError!({ code: 'adsDisabled' });
    await r;
    await ads1.interstitial();
    expect(ads).toHaveLength(1);
  });

  it('gives up on an ad that never starts', async () => {
    vi.useFakeTimers();
    const { p } = await make();
    const r = p.showInterstitial();
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(r).resolves.toBeUndefined();
  });

  it('saves through the Data module, or localStorage when it is off', async () => {
    const { p, store } = await make();
    await p.saveData({ level: 4 });
    expect(JSON.parse(store['gf-test'])).toEqual({ level: 4 });
    expect(await p.loadData()).toEqual({ level: 4 });

    const off = await make({ dataOff: true });
    await off.p.saveData({ level: 7 });
    expect(JSON.parse(local['gf-test'])).toEqual({ level: 7 });
    expect(await off.p.loadData()).toEqual({ level: 7 });
  });

  it('follows settings.muteAudio, including at startup', async () => {
    const { p, setSettings } = await make({ muteAudio: true });
    const seen: boolean[] = [];
    p.onAudioChange((on) => seen.push(on));
    setSettings({ muteAudio: false });
    setSettings({ muteAudio: true });
    expect(seen).toEqual([false, true, false]);
  });
});
