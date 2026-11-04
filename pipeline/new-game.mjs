#!/usr/bin/env node
// Usage: npm run new-game -- <game-id> [--template blank]
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, fail } from './lib.mjs';
import { IDEAS, checkIdeas, loadIdeas } from './ideas.mjs';
import { setStatus } from './ideas-lib.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const tIdx = args.indexOf('--template');
const template = tIdx >= 0 ? args[tIdx + 1] : 'blank';

if (!id || !/^[a-z][a-z0-9-]{1,40}$/.test(id)) fail('id игры: латиница в нижнем регистре, цифры и дефис, например merge-cats');
const src = join(ROOT, 'templates', template);
const dst = join(ROOT, 'games', id);
if (!existsSync(src)) fail(`Нет шаблона templates/${template}`);
if (existsSync(dst)) fail(`games/${id} уже существует`);

// A game starts only from a concept the human approved (knowledge/ideas.md, status «одобрен»).
const idea = loadIdeas().rows.find((r) => r.concept === id);
if (!idea) fail(`В knowledge/ideas.md нет идеи с концептом ${id}. Сначала концепт (скилл concept), потом одобрение человека.`);
if (idea.status !== 'одобрен') fail(`${idea.id} «${idea.title}»: статус «${idea.status}», а нужен «одобрен». Одобряет человек.`);
const conceptErrors = checkIdeas();
if (conceptErrors.length) fail(`Сначала исправьте knowledge/ideas.md:\n  ${conceptErrors.join('\n  ')}`);

cpSync(src, dst, { recursive: true, filter: (p) => !p.includes('node_modules') });
const cfgPath = join(dst, 'game.config.ts');
writeFileSync(cfgPath, readFileSync(cfgPath, 'utf8').replace(/id: '[^']*'/, `id: '${id}'`));
cpSync(join(ROOT, 'knowledge/concepts', `${id}.md`), join(dst, 'CONCEPT.md'));
writeFileSync(IDEAS, setStatus(readFileSync(IDEAS, 'utf8'), idea.id, 'в разработке'));
console.log(`✔ games/${id} создана из templates/${template}, концепт скопирован в CONCEPT.md, ${idea.id} → «в разработке»
  Дальше: game.config.ts и core loop, затем  npm run dev -- ${id}`);
