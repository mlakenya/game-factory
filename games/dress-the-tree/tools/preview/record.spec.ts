import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { LEVELS } from '../../content/levels';
import { TOY_WEIGHTS } from '../../content/toys';
import { generate } from '../../src/logic/generator';
import { solve } from '../../src/logic/solver';

/**
 * Plays a weight level from start to win in each video format, frame by frame: requestAnimationFrame and
 * performance.now are replaced by a clock this script advances 1/30 s at a time, and every frame is
 * screenshotted to test-results/preview/<format>/. The game runs at its normal speed in game time, so the
 * video is smooth 30 fps whatever the machine (headless WebGL is too slow for live capture).
 * make-videos.sh turns the frames into the final mp4s.
 */
const LEVEL = Number(process.env.PREVIEW_LEVEL ?? 5);
const out = join(process.cwd(), 'test-results/preview');
const FPS = 30;
/** One recording at the portrait video size (2:3); the landscape video reuses its canvas area. */
const FORMATS = { portrait: { width: 1080, height: 1620 } };

const tapAt = async (page: Page, fx: number, fy: number) => {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
};
const tapSlot = async (page: Page, branch: number, hook: number) => {
  const p = await page.evaluate(([b, h]) => (window as any).__dtt.point(b, h), [branch, hook]);
  await tapAt(page, p.fx, p.fy);
};

/** Installed before the game loads: a manual clock for rAF, performance.now and Date.now. */
const fakeClock = () => {
  const w = window as any;
  const realNow = performance.now.bind(performance);
  const realDate = Date.now;
  let manual = false;
  let t = 0;
  let base = 0;
  let queue: Array<FrameRequestCallback> = [];
  const realRaf = window.requestAnimationFrame.bind(window);
  performance.now = () => (manual ? t : realNow());
  Date.now = () => (manual ? base + t : realDate());
  window.requestAnimationFrame = (cb) => {
    if (manual) { queue.push(cb); return queue.length; }
    return realRaf((ts) => (manual ? queue.push(cb) : cb(ts)));
  };
  w.__clock = {
    start: () => { t = realNow(); base = realDate() - t; manual = true; },
    step: (ms: number) => { t += ms; const q = queue; queue = []; q.forEach((cb) => cb(t)); },
  };
};

for (const [name, size] of Object.entries(FORMATS)) {
  test(`preview ${name}`, async ({ browser }) => {
    const dir = join(out, name);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.addInitScript(fakeClock);
    await page.goto('/dress-the-tree--crazygames/index.html?mock&rewarded=0&lang=en');
    await page.evaluate(() => localStorage.setItem('gf-dress-the-tree',
      JSON.stringify({ unlocked: 30, stars: [], hints: ['basic', 'weight', 'hidden', 'frozen'], muted: true, musicOff: true })));
    await page.reload();
    await page.waitForFunction(() => (window as any).__gameReady === true);
    await tapAt(page, (360 - 220) / 720, 1030 / 1280); // level map
    const i = LEVEL - 1;
    await tapAt(page, (360 + ((i % 5) - 2) * 128) / 720, (200 + Math.floor(i / 5) * 150) / 1280);
    await expect.poll(async () => (await page.evaluate(() => (window as any).__dtt?.state()))?.level).toBe(LEVEL);
    await page.waitForTimeout(700); // level intro animation settles

    await page.evaluate(() => (window as any).__clock.start());
    let n = 0;
    const frames = async (count: number) => {
      for (let k = 0; k < count; k++) {
        await page.evaluate((ms) => (window as any).__clock.step(ms), 1000 / FPS);
        await page.screenshot({ path: join(dir, `f${String(n++).padStart(5, '0')}.png`) });
      }
    };
    await frames(Math.round(0.5 * FPS));
    const { moves } = solve(generate(LEVELS[i], TOY_WEIGHTS));
    for (const m of moves) {
      await tapSlot(page, m.from.branch, m.from.hook);
      await frames(Math.round(0.45 * FPS));
      await tapSlot(page, m.to.branch, m.to.hook);
      await frames(Math.round(1.15 * FPS));
    }
    expect((await page.evaluate(() => (window as any).__dtt.state())).status).toBe('won');
    await frames(Math.round(3.2 * FPS)); // win overlay with stars
    await context.close();
    console.log(`${name}: ${moves.length} moves, ${n} frames, ${(n / FPS).toFixed(1)} s`);
  });
}
