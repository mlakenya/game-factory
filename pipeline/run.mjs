#!/usr/bin/env node
// Usage: node pipeline/run.mjs dev <game> | build <game...> | build --all
import { createServer, build } from 'vite';
import { join } from 'node:path';
import { ROOT, distDir, resolveTarget, targetsFromArgs } from './lib.mjs';

const [cmd, ...args] = process.argv.slice(2);

const viteConfig = (t) => ({
  configFile: false,
  root: t.path,
  base: './', // Yandex serves the game from a subfolder: all asset paths must be relative
  logLevel: 'warn',
  resolve: { alias: { '@engine': join(ROOT, 'engine') } },
  server: { host: true },
  build: {
    outDir: distDir(t),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } },
  },
});

if (cmd === 'dev') {
  const t = resolveTarget(args[0]);
  const server = await createServer(viteConfig(t));
  await server.listen();
  server.printUrls();
  console.log(`  ${t.kind}/${t.name}: заглушка платформы активна (Yandex SDK есть только на площадке). ?lang=en для английского`);
} else if (cmd === 'build') {
  for (const t of targetsFromArgs(args)) {
    await build(viteConfig(t));
    console.log(`✔ built ${t.kind}/${t.name} → ${distDir(t).replace(ROOT + '/', '')}`);
  }
} else {
  console.error('Usage: run.mjs dev <game> | build <game...|--all>');
  process.exit(1);
}
