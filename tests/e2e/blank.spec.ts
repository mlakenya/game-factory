import { expect, test } from '@playwright/test';

/** Template-specific flow: menu → game → gameplayStart, hidden tab pauses the loop. */
const url = '/_template-blank/index.html?mock';

test('blank: play button starts gameplay', async ({ page }) => {
  await page.goto(url);
  await page.waitForFunction(() => (window as any).__gameReady === true);
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.55);
  await expect.poll(() => page.evaluate(() => (window as any).__platform.calls.start)).toBe(1);
});
