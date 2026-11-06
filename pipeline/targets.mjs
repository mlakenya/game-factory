// Build targets: which portal SDK a build talks to. Game code is the same; engine/platform picks the adapter.
//   yandex   — Yandex Games SDK v2 (<script src="/sdk.js">), dist/<game>
//   playgama — Playgama Bridge, runtime shipped inside the build, dist/<game>--playgama
//   crazygames — CrazyGames SDK v3, loaded by engine/platform from sdk.crazygames.com, dist/<game>--crazygames
import playgamaBridge from '@playgama/bridge/vite';
import { fail } from './lib.mjs';

export const TARGETS = ['yandex', 'playgama', 'crazygames'];

/** `--target yandex|playgama|all` from CLI args; default yandex (or all with defaultAll). */
export function targetsFromFlag(args, { defaultAll = false } = {}) {
  const i = args.indexOf('--target');
  const v = i >= 0 ? args[i + 1] : defaultAll ? 'all' : 'yandex';
  if (v === 'all') return TARGETS;
  if (!TARGETS.includes(v)) fail(`Неизвестная цель сборки: ${v}. Есть: ${TARGETS.join(', ')}, all`);
  return [v];
}

/** Args without `--target <v>`, so the rest can be read as game names. */
export const stripTarget = (args) => args.filter((a, i) => a !== '--target' && args[i - 1] !== '--target');

/**
 * Bridge settings shipped next to index.html (required: the build check fails without it).
 * Bridge paces interstitials (Playgama rule: no own timers in the game); 60 s is Bridge's documented default.
 */
export const bridgeConfig = () => ({
  advertisement: { minimumDelayBetweenInterstitial: 60 },
});

/** Removes the Yandex SDK tag (and its comment) from index.html: only the yandex build loads /sdk.js. */
const stripYandexSdk = (html) => html
  .replace(/[ \t]*<!--[^>]*Yandex Games SDK[^>]*-->\n?/i, '')
  .replace(/[ \t]*<script[^>]+src=["']\/sdk\.js["'][^>]*><\/script>\n?/, '');

/** Vite plugins for a target. */
export function targetPlugins(target) {
  // CrazyGames: the SDK is injected by engine/platform/crazygames.ts (skipped with ?mock).
  if (target === 'crazygames') return [{ name: 'gf-crazygames-html', transformIndexHtml: stripYandexSdk }];
  if (target !== 'playgama') return [];
  return [
    {
      name: 'gf-playgama-html',
      // Bridge loads the Yandex SDK itself when it runs on Yandex; our own /sdk.js tag must go.
      transformIndexHtml: stripYandexSdk,
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'playgama-bridge-config.json', source: JSON.stringify(bridgeConfig(), null, 2) });
      },
    },
    // mode 'local': ./playgama-bridge.js is copied into the build, no CDN (factory rule 6).
    playgamaBridge({ mode: 'local' }),
  ];
}
