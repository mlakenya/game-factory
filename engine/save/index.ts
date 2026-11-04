import type { Platform } from '../platform';

/**
 * Typed save store over platform cloud saves. Debounces writes so we never spam the SDK
 * (Yandex rate-limits setData).
 */
export class SaveStore<T extends object> {
  private data: T;
  private timer: ReturnType<typeof setTimeout> | undefined;

  private constructor(private platform: Platform, defaults: T, loaded: Partial<T>, private debounceMs: number) {
    this.data = { ...defaults, ...loaded };
  }

  static async load<T extends object>(platform: Platform, defaults: T, debounceMs = 1000) {
    const loaded = await platform.loadData<T>();
    return new SaveStore<T>(platform, defaults, loaded, debounceMs);
  }

  get<K extends keyof T>(key: K): T[K] { return this.data[key]; }

  set<K extends keyof T>(key: K, value: T[K]) {
    this.data[key] = value;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  async flush() {
    clearTimeout(this.timer);
    await this.platform.saveData(this.data);
  }

  snapshot(): Readonly<T> { return { ...this.data }; }
}
