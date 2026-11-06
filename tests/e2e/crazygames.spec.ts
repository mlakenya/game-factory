import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every CrazyGames build (dist/<game>--crazygames) boots on the CrazyGames SDK v3 surface. The real SDK
 * lives on sdk.crazygames.com; here that URL is answered with tests/e2e/fixtures/crazygames-sdk-fake.js,
 * so the test checks our side of the integration: lifecycle events, locale, Data module, muteAudio.
 */
const dist = join(process.cwd(), 'dist');
const builds = existsSync(dist) ? readdirSync(dist).filter((d) => d.endsWith('--crazygames') && existsSync(join(dist, d, 'index.html'))) : [];
const fakeSdk = readFileSync(join(process.cwd(), 'tests/e2e/fixtures/crazygames-sdk-fake.js'), 'utf8');

test('there is at least one CrazyGames build in dist/', () => {
  expect(builds.length, 'run npm run build:all first').toBeGreaterThan(0);
});

for (const name of builds) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.route('https://sdk.crazygames.com/crazygames-sdk-v3.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fakeSdk }));
    });

    test('boots on the CrazyGames SDK, reports loading and gameplay, saves through the Data module', async ({ page }) => {
      const errors: string[] = [];
      const external: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
      page.on('request', (r) => {
        const u = r.url();
        if (!u.startsWith('http://localhost') && !u.startsWith('data:') && !u.startsWith('https://sdk.crazygames.com/')) external.push(u);
      });

      await page.goto(`/${name}/index.html?cgLocale=ru-RU`);
      await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
      await expect(page.locator('canvas')).toBeVisible();
      expect(await page.evaluate(() => (window as any).__platform.name)).toBe('crazygames');
      expect(await page.evaluate(() => document.documentElement.lang)).toBe('ru');
      expect(await page.evaluate(() => (window as any).__cg.log)).toEqual(['init', 'loadingStart', 'loadingStop']);

      // Taps around the play area until the game reports gameplayStart (the end of the "initial download").
      const box = (await page.locator('canvas').boundingBox())!;
      for (const fy of [0.7, 0.55, 0.5]) {
        if ((await page.evaluate(() => (window as any).__cg.log)).includes('gameplayStart')) break;
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * fy);
        await page.waitForTimeout(300);
      }
      expect(await page.evaluate(() => (window as any).__cg.log)).toContain('gameplayStart');

      // Progress goes through the Data module and survives a reload.
      await page.evaluate(async () => {
        const p = (window as any).__platform;
        await p.saveData({ ...(await p.loadData()), __e2e: 42 });
      });
      expect(await page.evaluate(() => (window as any).__cg.log)).toContain('data:set');
      await page.reload();
      await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
      expect(await page.evaluate(async () => ((await (window as any).__platform.loadData()) as any).__e2e)).toBe(42);

      expect(external, external.join('\n')).toEqual([]);
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('falls back to English for other locales', async ({ page }) => {
      await page.goto(`/${name}/index.html?cgLocale=pt-BR`);
      await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
      expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    });

    test('settings.muteAudio reaches the game as a portal mute, at startup and on change', async ({ page }) => {
      await page.goto(`/${name}/index.html?muteAudio=true`);
      await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
      await page.evaluate(() => {
        (window as any).__audio = [];
        (window as any).__platform.onAudioChange((on: boolean) => (window as any).__audio.push(on));
      });
      await page.evaluate(() => (window as any).__cg.setMute(false));
      expect(await page.evaluate(() => (window as any).__audio)).toEqual([false, true]);
    });
  });
}
