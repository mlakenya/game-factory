#!/usr/bin/env node
// Usage: npm run pack -- <game>   → release/<game>/<game>-<date>.zip (index.html at archive root)
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { zipSync } from 'fflate';
import { ROOT, distDir, fail, resolveTarget } from './lib.mjs';

const t = resolveTarget(process.argv[2]);
if (t.kind !== 'games') fail('Пакуются только игры из games/');
execFileSync(process.execPath, [join(ROOT, 'pipeline/run.mjs'), 'build', t.name], { stdio: 'inherit' });
execFileSync(process.execPath, [join(ROOT, 'pipeline/audit.mjs'), t.name], { stdio: 'inherit' });

const dist = distDir(t);
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const entries = Object.fromEntries(walk(dist).map((f) => [relative(dist, f).split('\\').join('/'), readFileSync(f)]));
const zip = zipSync(entries, { level: 9 });
const outDir = join(ROOT, 'release', t.name);
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${t.name}-${new Date().toISOString().slice(0, 10)}.zip`);
writeFileSync(out, zip);
console.log(`✔ ${relative(ROOT, out)} (${(zip.length / 1e6).toFixed(2)} МБ)
  Медиа для каталога (иконка 512×512, обложка 800×470, скриншоты, тексты RU/EN) — см. скилл release-pack`);
