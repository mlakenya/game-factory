import { defineConfig } from '@playwright/test';

/**
 * Records gameplay for the CrazyGames preview videos (not part of npm run check).
 *   npm run build -- dress-the-tree --target crazygames
 *   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test -c games/dress-the-tree/tools/preview/preview.config.ts
 *   bash games/dress-the-tree/tools/preview/make-videos.sh
 */
const port = 4190;
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  outputDir: '../../../../test-results/preview',
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: {
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: { command: 'node pipeline/serve.mjs', cwd: '../../../..', url: `http://localhost:${port}`, env: { PORT: String(port) }, reuseExistingServer: true },
});
