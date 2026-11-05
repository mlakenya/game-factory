import { MockPlatform } from './mock';
import { PlaygamaPlatform } from './playgama';
import type { Platform } from './types';
import { YandexPlatform } from './yandex';

export type { Platform, AdCallbacks, Lang } from './types';
export { MockPlatform } from './mock';

/**
 * Build target: `import.meta.env.GF_TARGET`, a compile-time constant set by pipeline/run.mjs (vite `define`,
 * 'yandex' in unit tests). Games test `import.meta.env.GF_TARGET` directly when a branch must vanish
 * from other builds (with its dynamic imports): bundlers fold it only where it is written inline.
 */
export const BUILD_TARGET = import.meta.env.GF_TARGET;

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
