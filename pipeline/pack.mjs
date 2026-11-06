#!/usr/bin/env node
// Usage: npm run pack -- <game> [--target yandex|playgama|crazygames|all]
//   → release/<game>/<game>-<date>.zip (Yandex), release/<game>/<game>-playgama-<date>.zip (index.html at archive root)
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { zipSync } from 'fflate';
import { ROOT, distDir, fail, resolveTarget } from './lib.mjs';
import { stripTarget, targetsFromFlag } from './targets.mjs';

const rawArgs = process.argv.slice(2);
const t = resolveTarget(stripTarget(rawArgs)[0]);
if (t.kind !== 'games') fail('Пакуются только игры из games/');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const target of targetsFromFlag(rawArgs)) {
  execFileSync(process.execPath, [join(ROOT, 'pipeline/run.mjs'), 'build', t.name, '--target', target], { stdio: 'inherit' });
  execFileSync(process.execPath, [join(ROOT, 'pipeline/audit.mjs'), t.name, '--target', target], { stdio: 'inherit' });

  const dist = distDir(t, target);
  const entries = Object.fromEntries(walk(dist).map((f) => [relative(dist, f).split('\\').join('/'), readFileSync(f)]));
  const zip = zipSync(entries, { level: 9 });
  const outDir = join(ROOT, 'release', t.name);
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${t.name}${target === 'yandex' ? '' : `-${target}`}-${new Date().toISOString().slice(0, 10)}.zip`);
  writeFileSync(out, zip);
  console.log(`✔ ${relative(ROOT, out)} (${(zip.length / 1e6).toFixed(2)} МБ)
  Медиа для каталога (иконка 512×512, обложка 800×470, скриншоты, тексты RU/EN) — см. скилл release-pack`);
}
