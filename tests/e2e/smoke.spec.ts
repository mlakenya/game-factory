import { expect, test } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Smoke test for EVERY built game and template in dist/: loads without console errors,
 * calls gameReady, renders a canvas, survives a few taps, starts/stops gameplay.
 * Game-specific tests go to tests/e2e/<game>.spec.ts.
 */
const dist = join(process.cwd(), 'dist');
const targets = existsSync(dist) ? readdirSync(dist).filter((d) => existsSync(join(dist, d, 'index.html'))) : [];

test('there is at least one build in dist/', () => {
  expect(targets.length, 'run npm run build:all first').toBeGreaterThan(0);
});

type Calls = { ready: number; start: number; stop: number };

for (const name of targets) {
  test.describe(name, () => {
    for (const lang of ['ru', 'en']) {
      test(`boots and plays (${lang})`, async ({ page }, info) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));

        await page.goto(`/${name}/index.html?mock&lang=${lang}`);
        await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 15_000 });
        await expect(page.locator('canvas')).toBeVisible();

        const calls = () => page.evaluate(() => (window as any).__platform.calls as Calls);
        expect((await calls()).ready).toBe(1);
        expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);

        // Tap around the play area: generic games should start on a tap in the middle.
        const box = (await page.locator('canvas').boundingBox())!;
        for (const [fx, fy] of [[0.5, 0.55], [0.5, 0.5], [0.3, 0.6], [0.7, 0.4], [0.5, 0.7]]) {
          await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
          await page.waitForTimeout(150);
        }
        await page.screenshot({ path: info.outputPath(`${name}-${lang}.png`) });

        // Page must not scroll (moderation reject reason).
        expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= innerHeight + 1)).toBe(true);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }
  });
}
