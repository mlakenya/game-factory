import { expect, test } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every Playgama build (dist/<game>--playgama) boots on the real Bridge runtime shipped in the build:
 * no ?mock, Bridge runs in its own local mode. Checks Playgama's required steps that a browser can see.
 */
const dist = join(process.cwd(), 'dist');
const builds = existsSync(dist) ? readdirSync(dist).filter((d) => d.endsWith('--playgama') && existsSync(join(dist, d, 'index.html'))) : [];

test('there is at least one Playgama build in dist/', () => {
  expect(builds.length, 'run npm run build:all first').toBeGreaterThan(0);
});

for (const name of builds) {
  test(`${name}: boots on Playgama Bridge, saves through it, loads nothing external`, async ({ page }) => {
    const errors: string[] = [];
    const external: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
    page.on('request', (r) => { if (!r.url().startsWith('http://localhost') && !r.url().startsWith('data:')) external.push(r.url()); });

    await page.goto(`/${name}/index.html`);
    await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
    await expect(page.locator('canvas')).toBeVisible();

    // Bridge is the first script in <head>, loaded from the build, and the game runs on it.
    expect(await page.evaluate(() => document.head.querySelector('script')?.getAttribute('src'))).toBe('./playgama-bridge.js');
    const info = await page.evaluate(() => ({
      platform: (window as any).__platform.name,
      initialized: (window as any).bridge.isInitialized,
      bridgeLang: (window as any).bridge.platform.language,
      lang: document.documentElement.lang,
    }));
    expect(info.platform).toBe('playgama');
    expect(info.initialized).toBe(true);
    expect(info.lang).toBe(info.bridgeLang === 'ru' ? 'ru' : 'en');

    // Progress goes through Bridge storage and survives a reload.
    await page.evaluate(async () => {
      const p = (window as any).__platform;
      await p.saveData({ ...(await p.loadData()), __e2e: 42 });
    });
    await page.reload();
    await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
    expect(await page.evaluate(async () => ((await (window as any).__platform.loadData()) as any).__e2e)).toBe(42);

    expect(external, external.join('\n')).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

// Playgama 3.3.2: sound must come from files. Games that ship audio files must actually load and decode them.
for (const name of builds.filter((b) => readdirSync(join(dist, b, 'assets')).some((f) => /\.(mp3|ogg)$/.test(f)))) {
  test(`${name}: sound files load and decode after the first tap`, async ({ page }) => {
    const audio: string[] = [];
    const errors: string[] = [];
    page.on('response', (r) => { if (/\.(mp3|ogg)$/.test(r.url())) audio.push(`${r.status()} ${r.url().split('/').pop()}`); });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`/${name}/index.html`);
    await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect.poll(() => audio.length, { timeout: 10_000 }).toBeGreaterThan(1);
    await page.waitForTimeout(1000); // let decodeAudioData finish
    expect(audio.every((a) => a.startsWith('200 ')), audio.join('\n')).toBe(true);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}
