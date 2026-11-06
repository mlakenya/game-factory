#!/usr/bin/env node
// Usage: node pipeline/run.mjs dev <game> | build <game...> | build --all   [--target yandex|playgama|crazygames|all]
import { createServer, build } from 'vite';
import { join } from 'node:path';
import { ROOT, distDir, resolveTarget, targetsFromArgs } from './lib.mjs';
import { stripTarget, targetPlugins, targetsFromFlag } from './targets.mjs';

const [cmd, ...rawArgs] = process.argv.slice(2);
const platforms = targetsFromFlag(rawArgs, { defaultAll: cmd === 'build' && rawArgs.includes('--all') });
const args = stripTarget(rawArgs);

const viteConfig = (t, target) => ({
  configFile: false,
  root: t.path,
  base: './', // Yandex serves the game from a subfolder: all asset paths must be relative
  logLevel: 'warn',
  resolve: { alias: { '@engine': join(ROOT, 'engine') } },
  define: { 'import.meta.env.GF_TARGET': JSON.stringify(target) },
  plugins: targetPlugins(target),
  server: { host: true },
  build: {
    outDir: distDir(t, target),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } },
  },
});

if (cmd === 'dev') {
  const t = resolveTarget(args[0]);
  const target = platforms[0];
  const server = await createServer(viteConfig(t, target));
  await server.listen();
  server.printUrls();
  console.log(target === 'playgama'
    ? `  ${t.kind}/${t.name} [playgama]: Bridge работает вне площадки с заглушками. ?mock для нашей заглушки, ?lang=en для английского`
    : target === 'crazygames'
    ? `  ${t.kind}/${t.name} [crazygames]: на localhost SDK в режиме local (демо-реклама). ?mock для нашей заглушки`
    : `  ${t.kind}/${t.name}: заглушка платформы активна (Yandex SDK есть только на площадке). ?lang=en для английского`);
} else if (cmd === 'build') {
  for (const t of targetsFromArgs(args)) {
    for (const target of platforms) {
      await build(viteConfig(t, target));
      console.log(`✔ built ${t.kind}/${t.name} [${target}] → ${distDir(t, target).replace(ROOT + '/', '')}`);
    }
  }
} else {
  console.error('Usage: run.mjs dev <game> | build <game...|--all> [--target yandex|playgama|crazygames|all]');
  process.exit(1);
}
