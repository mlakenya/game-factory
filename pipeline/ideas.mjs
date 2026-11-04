#!/usr/bin/env node
// Usage:
//   npm run ideas                     list ideas grouped by status
//   npm run ideas -- --check          validate knowledge/ideas.md against concepts/ and games/ (part of npm run check)
//   npm run ideas -- next             print the next free idea number
//   npm run ideas -- set 3 одобрен   change an idea's status
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, fail } from './lib.mjs';
import { STATUSES, nextId, parseIdeas, setStatus, validateIdeas } from './ideas-lib.mjs';

export const IDEAS = join(ROOT, 'knowledge/ideas.md');
const CONCEPTS = join(ROOT, 'knowledge/concepts');

export function loadIdeas() {
  if (!existsSync(IDEAS)) fail('Нет knowledge/ideas.md');
  return parseIdeas(readFileSync(IDEAS, 'utf8'));
}

export function checkIdeas() {
  const { rows, errors } = loadIdeas();
  const gamesDir = join(ROOT, 'games');
  const games = existsSync(gamesDir)
    ? readdirSync(gamesDir).filter((n) => statSync(join(gamesDir, n)).isDirectory() && existsSync(join(gamesDir, n, 'index.html')))
    : [];
  const conceptPath = (s) => join(CONCEPTS, `${s}.md`);
  return errors.concat(
    validateIdeas(rows, {
      conceptExists: (s) => existsSync(conceptPath(s)),
      conceptIdeaId: (s) => readFileSync(conceptPath(s), 'utf8').match(/\*\*Идея:\*\*\s*(\d+)/)?.[1] ?? null,
      games,
    }),
  );
}

const [cmd, ...rest] = process.argv.slice(2);
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (cmd === '--check') {
    const errors = checkIdeas();
    if (errors.length) fail(`knowledge/ideas.md:\n  ${errors.join('\n  ')}`);
    console.log(`✔ knowledge/ideas.md: ${loadIdeas().rows.length} идей, ошибок нет`);
  } else if (cmd === 'next') {
    console.log(nextId(loadIdeas().rows));
  } else if (cmd === 'set') {
    const [id, ...st] = rest;
    const status = st.join(' ');
    if (!STATUSES.includes(status)) fail(`Статус: ${STATUSES.join(', ')}`);
    writeFileSync(IDEAS, setStatus(readFileSync(IDEAS, 'utf8'), id, status));
    const errors = checkIdeas();
    if (errors.length) console.warn(`⚠ после изменения:\n  ${errors.join('\n  ')}`);
    console.log(`✔ ${id} → ${status}`);
  } else {
    const { rows } = loadIdeas();
    for (const s of STATUSES) {
      const group = rows.filter((r) => r.status === s);
      if (!group.length) continue;
      console.log(`\n${s} (${group.length})`);
      for (const r of group) console.log(`  ${r.id}  ${r.title}${r.concept ? `  [${r.concept}]` : ''}`);
    }
  }
}
