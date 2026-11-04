#!/usr/bin/env node
// Usage: npm run new-game -- <game-id> [--template blank]
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, fail } from './lib.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const tIdx = args.indexOf('--template');
const template = tIdx >= 0 ? args[tIdx + 1] : 'blank';

if (!id || !/^[a-z][a-z0-9-]{1,40}$/.test(id)) fail('id игры: латиница в нижнем регистре, цифры и дефис, например merge-cats');
const src = join(ROOT, 'templates', template);
const dst = join(ROOT, 'games', id);
if (!existsSync(src)) fail(`Нет шаблона templates/${template}`);
if (existsSync(dst)) fail(`games/${id} уже существует`);

cpSync(src, dst, { recursive: true, filter: (p) => !p.includes('node_modules') });
const cfgPath = join(dst, 'game.config.ts');
writeFileSync(cfgPath, readFileSync(cfgPath, 'utf8').replace(/id: '[^']*'/, `id: '${id}'`));
writeFileSync(join(dst, 'CONCEPT.md'), readFileSync(join(ROOT, 'knowledge/concepts/_template.md'), 'utf8').replace('<id>', id));
console.log(`✔ games/${id} создана из templates/${template}
  Дальше: заполните games/${id}/CONCEPT.md и game.config.ts, затем  npm run dev -- ${id}`);
