#!/usr/bin/env node
/**
 * Yandex Games requirements linter for built games. Run after build.
 * Usage: npm run audit -- <game...> | --all
 * Each check maps to an item in .claude/skills/yandex-moderation/SKILL.md. Add a check here
 * every time moderation rejects something that a script could have caught.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, distDir, targetsFromArgs } from './lib.mjs';

const MAX_BYTES = 100 * 1024 * 1024;
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

let failed = 0;
for (const t of targetsFromArgs(process.argv.slice(2))) {
  const dist = distDir(t);
  const problems = [];
  const warnings = [];
  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`✖ ${t.kind}/${t.name}: нет сборки, сначала npm run build -- ${t.name}`);
    failed++;
    continue;
  }
  const files = walk(dist);
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(f, 'utf8')).join('\n');
  const gameSrc = walk(join(t.path, 'src')).map((f) => readFileSync(f, 'utf8')).join('\n');

  // [size] archive limit
  const total = files.reduce((s, f) => s + statSync(f).size, 0);
  if (total > MAX_BYTES) problems.push(`[size] сборка ${(total / 1e6).toFixed(1)} МБ > 100 МБ`);
  else if (total > 20e6) warnings.push(`[size] ${(total / 1e6).toFixed(1)} МБ — тяжело для мобильных, цель < 20 МБ`);

  // [sdk] SDK script with absolute /sdk.js
  if (!/<script[^>]+src=["']\/sdk\.js["']/.test(html)) problems.push('[sdk] в index.html нет <script src="/sdk.js">');

  // [paths] all local asset paths must be relative (game is served from a subfolder)
  for (const m of html.matchAll(/(?:src|href)=["'](\/[^"'/][^"']*)["']/g)) {
    if (m[1] !== '/sdk.js') problems.push(`[paths] абсолютный путь в index.html: ${m[1]}`);
  }

  // [external] no external scripts/styles/fonts (CDNs are blocked or slow; moderation flags them)
  for (const m of html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)["']/g)) problems.push(`[external] внешний ресурс: ${m[1]}`);

  // [lifecycle] LoadingAPI.ready + GameplayAPI start/stop must be wired through the engine
  if (!/gameReady\(\)/.test(gameSrc)) problems.push('[lifecycle] игра не вызывает platform.gameReady()');
  if (!/gameplayStart\(\)/.test(gameSrc) || !/gameplayStop\(\)/.test(gameSrc)) problems.push('[lifecycle] нет gameplayStart()/gameplayStop()');

  // [direct-sdk] games must not call YaGames directly — only engine/platform does
  if (/YaGames|ysdk\./.test(gameSrc)) problems.push('[direct-sdk] прямое обращение к YaGames в коде игры, используйте @engine/platform');

  // [ai] interactive AI inside games is forbidden (rule 1.23)
  if (/api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis/.test(js)) problems.push('[ai] обращение к ИИ-API в игре (правило 1.23)');

  // [i18n] ru + en present with the same keys
  const locPath = join(t.path, 'content', 'locales.ts');
  if (!existsSync(locPath)) problems.push('[i18n] нет content/locales.ts');
  else {
    const loc = readFileSync(locPath, 'utf8');
    const block = (lang) => (loc.match(new RegExp(`\\b${lang}:\\s*\\{([\\s\\S]*?)\\n  \\}`)) ?? [])[1];
    const keys = (b) => new Set([...(b ?? '').matchAll(/'([\w.]+)':/g)].map((m) => m[1]));
    const ru = keys(block('ru'));
    const en = keys(block('en'));
    if (!ru.size) problems.push('[i18n] нет русской локализации');
    if (!en.size) warnings.push('[i18n] нет английской локализации');
    const diff = [...ru].filter((k) => !en.has(k)).concat([...en].filter((k) => !ru.has(k)));
    if (en.size && diff.length) problems.push(`[i18n] ключи не совпадают: ${diff.join(', ')}`);
  }

  // [console] leftover debug logging
  if (/console\.log\(/.test(gameSrc)) warnings.push('[console] console.log в коде игры');

  const name = `${t.kind}/${t.name}`;
  if (problems.length) {
    failed++;
    console.error(`✖ ${name}\n${problems.map((p) => '   ' + p).join('\n')}`);
  } else console.log(`✔ ${name} (${(total / 1e6).toFixed(2)} МБ, ${files.length} файлов)`);
  warnings.forEach((w) => console.warn(`   ⚠ ${w}`));
}
process.exit(failed ? 1 : 0);
