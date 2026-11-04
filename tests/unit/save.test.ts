import { describe, expect, it, vi } from 'vitest';
import type { Platform } from '../../engine/platform/types';
import { SaveStore } from '../../engine/save';

function fakePlatform(initial: object) {
  const saved: object[] = [];
  const p = { loadData: async () => initial, saveData: async (d: object) => { saved.push({ ...d }); } } as unknown as Platform;
  return { p, saved };
}

describe('SaveStore', () => {
  it('merges defaults with loaded data', async () => {
    const { p } = fakePlatform({ best: 7 });
    const s = await SaveStore.load(p, { best: 0, muted: false });
    expect(s.snapshot()).toEqual({ best: 7, muted: false });
  });
  it('debounces writes', async () => {
    vi.useFakeTimers();
    const { p, saved } = fakePlatform({});
    const s = await SaveStore.load(p, { best: 0 }, 500);
    s.set('best', 1); s.set('best', 2); s.set('best', 3);
    await vi.advanceTimersByTimeAsync(600);
    expect(saved).toEqual([{ best: 3 }]);
    vi.useRealTimers();
  });
});
