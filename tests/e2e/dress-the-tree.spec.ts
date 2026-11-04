import { expect, test, type Page } from '@playwright/test';
import { LEVELS } from '../../games/dress-the-tree/content/levels';
import { TOY_WEIGHTS } from '../../games/dress-the-tree/content/toys';
import { type Board, type Move, applyMove, legalMoves, status, torque } from '../../games/dress-the-tree/src/logic/board';
import { generate } from '../../games/dress-the-tree/src/logic/generator';
import { solve } from '../../games/dress-the-tree/src/logic/solver';

/** Main scenario: menu → level → win by real taps; lean too far → star falls → rewarded revive. */
const url = '/dress-the-tree/index.html?mock';
const W = 720, H = 1280;

type Calls = { ready: number; start: number; stop: number; interstitial: number; rewarded: number };
const calls = (page: Page) => page.evaluate(() => (window as any).__platform.calls as Calls);
const state = (page: Page) => page.evaluate(() => (window as any).__dtt?.state());

async function tapAt(page: Page, fx: number, fy: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

async function tapSlot(page: Page, branch: number, hook: number) {
  const p = await page.evaluate(([b, h]) => (window as any).__dtt.point(b, h), [branch, hook]);
  await tapAt(page, p.fx, p.fy);
}

async function tapButton(page: Page, name: string) {
  // Overlays open after an animation in game time, which runs slower on a loaded CI machine.
  await expect.poll(() => page.evaluate((n) => (window as any).__dtt.button(n), name), { timeout: 15_000 }).not.toBeNull();
  const p = await page.evaluate((n) => (window as any).__dtt.button(n), name);
  await tapAt(page, p.fx, p.fy);
}

async function play(page: Page, moves: Move[]) {
  for (const m of moves) {
    await tapSlot(page, m.from.branch, m.from.hook);
    await tapSlot(page, m.to.branch, m.to.hook);
    await page.waitForTimeout(500); // let the tree finish leaning before the next tap
  }
}

async function openLevel(page: Page, level: number) {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem('gf-dress-the-tree',
    JSON.stringify({ unlocked: 30, stars: [], hints: ['basic', 'weight', 'hidden', 'frozen'], muted: true })));
  await page.reload();
  await page.waitForFunction(() => (window as any).__gameReady === true);
  await tapAt(page, (360 - 115) / W, 1030 / H); // levels
  const i = level - 1;
  await tapAt(page, (360 + ((i % 5) - 2) * 128) / W, (200 + Math.floor(i / 5) * 150) / H);
  await expect.poll(async () => (await state(page))?.level).toBe(level);
}

test('dress-the-tree: first level is won by tapping toys onto hooks', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as any).__gameReady === true);
  await tapAt(page, 0.5, 890 / H); // Play
  await expect.poll(async () => (await state(page))?.hint).toBe(true);
  expect((await calls(page)).start).toBe(1);
  await tapAt(page, 0.5, 0.5); // dismiss hint
  await expect.poll(async () => (await state(page))?.hint).toBe(false);

  const { moves } = solve(generate(LEVELS[0], TOY_WEIGHTS));
  await play(page, moves);
  await expect.poll(async () => (await state(page))?.status).toBe('won');
  await expect.poll(async () => (await calls(page)).stop).toBeGreaterThanOrEqual(2);
  // Progress is saved: level 2 unlocked.
  await page.waitForTimeout(1200); // SaveStore debounce
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gf-dress-the-tree') ?? '{}'));
  expect(saved.unlocked).toBe(2);
  expect(saved.stars[0]).toBe(3);
  // Next → level 2, no interstitial after level 1.
  await tapButton(page, 'btn-next');
  await expect.poll(async () => (await state(page))?.level).toBe(2);
  expect((await calls(page)).interstitial).toBe(0);
  expect(errors).toEqual([]);
});

test('dress-the-tree: leaning too far drops the star, rewarded brings it back', async ({ page }) => {
  await openLevel(page, 7);
  // Greedy "lean as much as possible" until the tree tips.
  let b: Board = generate(LEVELS[6], TOY_WEIGHTS);
  const moves: Move[] = [];
  while (status(b) === 'playing' && moves.length < 40) {
    const m = legalMoves(b).filter((x) => x.to.branch >= 0)
      .sort((x, y) => Math.abs(torque(applyMove(b, y).board)) - Math.abs(torque(applyMove(b, x).board)))[0];
    moves.push(m);
    b = applyMove(b, m).board;
  }
  expect(status(b)).toBe('lost');
  await play(page, moves);
  await expect.poll(async () => (await state(page))?.status).toBe('lost');
  const before = await calls(page);
  await tapButton(page, 'btn-revive');
  await expect.poll(async () => (await calls(page)).rewarded).toBe(before.rewarded + 1);
  await expect.poll(async () => (await state(page))?.status).toBe('playing');
  expect((await calls(page)).start).toBeGreaterThan(before.start);
});
