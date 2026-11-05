import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ads } from '../../engine/ads';
import { PlaygamaPlatform } from '../../engine/platform/playgama';

/** Fake Playgama Bridge: records messages, lets the test drive ad states. */
function fakeBridge(opts: { audio?: boolean; rewarded?: boolean; interstitial?: boolean } = {}) {
  const handlers: Record<string, Array<(v: any) => void>> = {};
  const on = (e: string, cb: (v: any) => void) => { (handlers[e] ??= []).push(cb); };
  const emit = (e: string, v: unknown) => handlers[e]?.forEach((h) => h(v));
  const store: Record<string, unknown> = {};
  const messages: string[] = [];
  const shown: string[] = [];
  const bridge = {
    initialize: vi.fn(async () => undefined),
    EVENT_NAME: {
      INTERSTITIAL_STATE_CHANGED: 'i', REWARDED_STATE_CHANGED: 'r', PAUSE_STATE_CHANGED: 'p', AUDIO_STATE_CHANGED: 'a',
    },
    platform: {
      id: 'playgama', language: 'ru', isAudioEnabled: opts.audio ?? true,
      sendMessage: async (m: string) => { messages.push(m); },
      on,
    },
    device: { type: 'mobile' },
    advertisement: {
      isInterstitialSupported: opts.interstitial ?? true,
      isRewardedSupported: opts.rewarded ?? true,
      showInterstitial: () => shown.push('interstitial'),
      showRewarded: () => shown.push('rewarded'),
      on,
    },
    storage: {
      get: async (k: string) => store[k] ?? null,
      set: async (k: string, v: unknown) => { store[k] = v; },
    },
  };
  return { bridge, emit, store, messages, shown };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('PlaygamaPlatform', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { hidden: false, addEventListener: () => undefined });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  async function make(opts?: Parameters<typeof fakeBridge>[0]) {
    const fb = fakeBridge(opts);
    vi.stubGlobal('window', { bridge: fb.bridge });
    const p = (await PlaygamaPlatform.create({ storageKey: 'gf-test' }))!;
    return { p, ...fb };
  }

  it('returns null without the Bridge runtime', async () => {
    vi.stubGlobal('window', {});
    expect(await PlaygamaPlatform.create()).toBeNull();
  });

  it('takes language and device from the Bridge, sends lifecycle messages once each', async () => {
    const { p, messages, bridge } = await make();
    expect(bridge.initialize).toHaveBeenCalledOnce();
    expect(p.lang).toBe('ru');
    expect(p.device).toBe('mobile');
    p.gameReady();
    p.gameplayStart(); p.gameplayStart();
    p.gameplayStop(); p.gameplayStop();
    expect(messages).toEqual(['game_ready', 'gameplay_started', 'gameplay_stopped']);
  });

  it('grants a reward only after the rewarded state, pausing and resuming around the ad', async () => {
    const { p, emit, messages } = await make();
    p.gameplayStart();
    const pause = vi.fn(); const resume = vi.fn();
    const r = p.showRewarded({ onPause: pause, onResume: resume });
    emit('r', 'loading'); emit('r', 'opened');
    expect(pause).toHaveBeenCalledOnce();
    emit('r', 'rewarded'); emit('r', 'closed');
    expect(await r).toBe(true);
    expect(resume).toHaveBeenCalledOnce();
    expect(messages).toEqual(['gameplay_started', 'gameplay_stopped', 'gameplay_started']);
  });

  it('does not grant a reward when the ad is closed early or fails', async () => {
    const { p, emit } = await make();
    const closed = p.showRewarded();
    emit('r', 'opened'); emit('r', 'closed');
    expect(await closed).toBe(false);
    const failed = p.showRewarded();
    emit('r', 'failed');
    expect(await failed).toBe(false);
  });

  it('resolves an interstitial that Bridge refuses (delay not passed) without pausing the game', async () => {
    const { p, emit } = await make();
    const pause = vi.fn();
    const ad = p.showInterstitial({ onPause: pause });
    emit('i', 'loading'); emit('i', 'failed');
    await ad;
    expect(pause).not.toHaveBeenCalled();
  });

  it('gives up on an ad stuck in loading', async () => {
    vi.useFakeTimers();
    const { p } = await make();
    const ad = p.showInterstitial();
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(ad).resolves.toBeUndefined();
  });

  it('skips unsupported ads and reports rewarded support', async () => {
    const { p, shown } = await make({ rewarded: false, interstitial: false });
    expect(p.rewardedSupported).toBe(false);
    expect(await p.showRewarded()).toBe(false);
    await p.showInterstitial();
    expect(shown).toEqual([]);
  });

  it('saves and loads progress as one key through Bridge storage', async () => {
    const { p, store } = await make();
    expect(await p.loadData()).toEqual({});
    await p.saveData({ stars: [3, 2], muted: true });
    expect(Object.keys(store)).toEqual(['gf-test']);
    expect(await p.loadData()).toEqual({ stars: [3, 2], muted: true });
  });

  it('starts muted when the portal has audio off, then follows audio and pause events', async () => {
    const { p, emit } = await make({ audio: false });
    const audio: boolean[] = []; const pause: boolean[] = [];
    p.onAudioChange((e) => audio.push(e));
    p.onPauseChange((x) => pause.push(x));
    emit('a', true); emit('p', true); emit('p', false);
    expect(audio).toEqual([false, true]);
    expect(pause).toEqual([true, false]);
  });

  it('lets Bridge pace interstitials: Ads asks at every pause', async () => {
    const { p, emit, shown } = await make();
    const ads = new Ads(p, { pause: () => undefined, resume: () => undefined }, 60_000);
    expect(ads.atEveryPause).toBe(true);
    for (let i = 0; i < 3; i++) {
      const ad = ads.interstitial();
      await flush();
      emit('i', 'failed');
      await ad;
    }
    expect(shown).toEqual(['interstitial', 'interstitial', 'interstitial']);
  });
});
