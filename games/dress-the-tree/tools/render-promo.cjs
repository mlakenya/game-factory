#!/usr/bin/env node
/**
 * Captures the catalog art drawn by src/promo/main.ts (promo.html?shot=<name>) into release/media/.
 * Start the dev server first (npm run dev -- dress-the-tree), then:
 *   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node games/dress-the-tree/tools/render-promo.cjs [baseUrl]
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');

const base = process.argv[2] ?? 'http://localhost:5173';
const media = join(__dirname, '../release/media');
const SHOTS = {
  'icon-a': [512, 512, 'icon-a.png'], 'icon-b': [512, 512, 'icon-b.png'], 'icon-c': [512, 512, 'icon-c.png'],
  'cover-en': [800, 470, 'cover-en.png'], 'cover-ru': [800, 470, 'cover-ru.png'],
  'pg-square': [800, 800, 'playgama/cover-square.png'],
  'pg-portrait': [1080, 1920, 'playgama/cover-portrait.png'],
  'pg-landscape': [1920, 1080, 'playgama/cover-landscape.png'],
};

(async () => {
  mkdirSync(join(media, 'playgama'), { recursive: true });
  const browser = await chromium.launch({
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  for (const [shot, [w, h, file]] of Object.entries(SHOTS)) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto(`${base}/promo.html?shot=${shot}`);
    await page.waitForFunction(() => window.__promoReady === true);
    await page.waitForTimeout(300); // one frame after the scene is built
    await page.locator('canvas').screenshot({ path: join(media, file) });
    await page.close();
    console.log(`${file} ${w}×${h}`);
  }
  await browser.close();
})();
