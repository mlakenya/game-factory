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

// A game starts only after the human approved the concept, the style and the assets (knowledge/ideas.md, status «ассеты одобрены»).
const idea = loadIdeas().rows.find((r) => r.concept === id);
if (!idea) fail(`В knowledge/ideas.md нет идеи с концептом ${id}. Сначала концепт (скилл concept), потом одобрение человека.`);
if (idea.status !== 'ассеты одобрены') {
  const next = { 'одобрен': 'стиль (скилл art-style)', 'стиль одобрен': 'ассеты (скилл assets)' }[idea.status] ?? 'концепт и одобрение';
  fail(`${idea.id} «${idea.title}»: статус «${idea.status}», а нужен «ассеты одобрены». Следующий шаг: ${next}. Одобряет человек.`);
}
const conceptErrors = checkIdeas();
if (conceptErrors.length) fail(`Сначала исправьте knowledge/ideas.md:\n  ${conceptErrors.join('\n  ')}`);

cpSync(src, dst, { recursive: true, filter: (p) => !p.includes('node_modules') });
const cfgPath = join(dst, 'game.config.ts');
writeFileSync(cfgPath, readFileSync(cfgPath, 'utf8').replace(/id: '[^']*'/, `id: '${id}'`));
cpSync(join(ROOT, 'knowledge/concepts', `${id}.md`), join(dst, 'CONCEPT.md'));
// Approved art becomes the game's assets; art/<id>/ stays as the source (boards, raw generations, prompts).
const art = join(ROOT, 'art', id);
cpSync(join(art, 'assets'), join(dst, 'assets'), { recursive: true });
cpSync(join(art, 'STYLE.md'), join(dst, 'STYLE.md'));
cpSync(join(art, 'CREDITS.md'), join(dst, 'CREDITS.md'));
writeFileSync(IDEAS, setStatus(readFileSync(IDEAS, 'utf8'), idea.id, 'в разработке'));
console.log(`✔ games/${id} создана из templates/${template}, концепт, стиль и ассеты скопированы (CONCEPT.md, STYLE.md, assets/), ${idea.id} → «в разработке»
  Дальше: game.config.ts и core loop, затем  npm run dev -- ${id}`);
