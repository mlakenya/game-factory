import { MockPlatform } from './mock';
import type { Platform } from './types';
import { YandexPlatform } from './yandex';

export type { Platform, AdCallbacks, Lang } from './types';
export { MockPlatform } from './mock';

/**
 * Picks the platform: Yandex SDK if present (and not forced to mock via ?mock),
 * otherwise MockPlatform. Exposes the instance as window.__platform for tests.
 */
export async function initPlatform(opts: { storageKey?: string } = {}): Promise<Platform> {
  const forceMock = new URLSearchParams(location.search).has('mock');
  const platform: Platform = (!forceMock && (await YandexPlatform.create())) || new MockPlatform(opts);
  (window as unknown as { __platform: Platform }).__platform = platform;
  return platform;
}
