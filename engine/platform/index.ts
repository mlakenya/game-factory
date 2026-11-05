import { MockPlatform } from './mock';
import { PlaygamaPlatform } from './playgama';
import type { Platform } from './types';
import { YandexPlatform } from './yandex';

export type { Platform, AdCallbacks, Lang } from './types';
export { MockPlatform } from './mock';

/** Build target, injected by pipeline/run.mjs (vite `define`). 'yandex' when built without it (unit tests). */
declare const __GF_TARGET__: 'yandex' | 'playgama' | undefined;
export const BUILD_TARGET: 'yandex' | 'playgama' = typeof __GF_TARGET__ === 'undefined' ? 'yandex' : __GF_TARGET__;

/**
 * Picks the platform for the build target: Yandex SDK or Playgama Bridge when present
 * (and not forced to mock via ?mock), otherwise MockPlatform.
 * Exposes the instance as window.__platform for tests.
 */
export async function initPlatform(opts: { storageKey?: string } = {}): Promise<Platform> {
  const forceMock = new URLSearchParams(location.search).has('mock');
  const real = forceMock ? null
    : BUILD_TARGET === 'playgama' ? await PlaygamaPlatform.create(opts)
    : await YandexPlatform.create();
  const platform: Platform = real || new MockPlatform(opts);
  (window as unknown as { __platform: Platform }).__platform = platform;
  return platform;
}
