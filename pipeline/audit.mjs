#!/usr/bin/env node
/**
 * Yandex Games requirements linter for built games. Run after build.
 * Usage: npm run audit -- <game...> | --all   [--target yandex|playgama|crazygames|all]  (--all audits every target)
 * Each check maps to an item in .claude/skills/yandex-moderation/SKILL.md. Add a check here
 * every time moderation rejects something that a script could have caught.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, distDir, targetsFromArgs } from './lib.mjs';
import { stripTarget, targetsFromFlag } from './targets.mjs';

const MAX_BYTES = 100 * 1024 * 1024;
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const rawArgs = process.argv.slice(2);
const platforms = targetsFromFlag(rawArgs, { defaultAll: rawArgs.includes('--all') });
let failed = 0;
for (const t of targetsFromArgs(stripTarget(rawArgs))) for (const target of platforms) {
  const dist = distDir(t, target);
  const problems = [];
  const warnings = [];
  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`✖ ${t.kind}/${t.name} [${target}]: нет сборки, сначала npm run build -- ${t.name} --target ${target}`);
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

  const yandexSdk = /<script[^>]+src=["']\/sdk\.js["']/.test(html);
  if (target === 'yandex') {
    // [sdk] SDK script with absolute /sdk.js
    if (!yandexSdk) problems.push('[sdk] в index.html нет <script src="/sdk.js">');
  } else if (target === 'playgama') {
    // [bridge] Bridge runtime shipped in the build and loaded before the game; Bridge loads /sdk.js itself on Yandex
    const tag = html.search(/<script[^>]+src=["']\.\/playgama-bridge\.js["']/);
    const game = html.search(/<script[^>]+type=["']module["']/);
    if (tag < 0) problems.push('[bridge] в index.html нет <script src="./playgama-bridge.js">');
    else if (game >= 0 && tag > game) problems.push('[bridge] playgama-bridge.js подключён после кода игры');
    if (!existsSync(join(dist, 'playgama-bridge.js'))) problems.push('[bridge] в сборке нет playgama-bridge.js');
    if (yandexSdk) problems.push('[bridge] в сборке Playgama остался <script src="/sdk.js">');
    try { JSON.parse(readFileSync(join(dist, 'playgama-bridge-config.json'), 'utf8')); }
    catch { problems.push('[bridge] нет или битый playgama-bridge-config.json'); }
    // [sound-files] Playgama 3.3.2: sound synthesized in code is not accepted, the build must ship audio files
    const audioFiles = files.filter((f) => /\.(mp3|ogg)$/i.test(f));
    if (/createOscillator\(/.test(gameSrc) && !audioFiles.length) {
      problems.push('[sound-files] звук синтезируется в коде, а в сборке нет mp3/ogg (Playgama 3.3.2). См. SampleBank в engine/audio');
    }
  } else if (target === 'crazygames') {
    // CrazyGames technical requirements: docs.crazygames.com/requirements/technical
    if (yandexSdk) problems.push('[cg-sdk] в сборке CrazyGames остался <script src="/sdk.js">');
    if (!js.includes('sdk.crazygames.com/crazygames-sdk-v3.js')) problems.push('[cg-sdk] в сборке нет CrazyGames SDK v3 (engine/platform/crazygames.ts)');
    if (files.some((f) => f.endsWith('playgama-bridge.js'))) problems.push('[cg-sdk] в сборке CrazyGames лежит Playgama Bridge');
    if (files.length > 1500) problems.push(`[cg-files] ${files.length} файлов > 1500`);
    if (total > 50e6) problems.push(`[cg-size] ${(total / 1e6).toFixed(1)} МБ > 50 МБ начальной загрузки`);
    // Same reason as Playgama: the build that goes to a portal other than Yandex plays sound from files.
    if (/createOscillator\(/.test(gameSrc) && !files.some((f) => /\.(mp3|ogg)$/i.test(f))) {
      warnings.push('[sound-files] звук только синтезом; для CrazyGames лучше файлы, как в сборке Playgama');
    }
    // CrazyGames forbids custom fullscreen buttons (the site has its own).
    if (/requestFullscreen|startFullscreen|scale\.toggleFullscreen/.test(gameSrc)) problems.push('[cg-fullscreen] своя кнопка полного экрана запрещена на CrazyGames');
  }

  // [paths] all local asset paths must be relative (game is served from a subfolder)
  for (const m of html.matchAll(/(?:src|href)=["'](\/[^"'/][^"']*)["']/g)) {
    if (!(target === 'yandex' && m[1] === '/sdk.js')) problems.push(`[paths] абсолютный путь в index.html: ${m[1]}`);
  }

  // [external] no external scripts/styles/fonts (CDNs are blocked or slow; moderation flags them)
  for (const m of html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)["']/g)) problems.push(`[external] внешний ресурс: ${m[1]}`);

  // [lifecycle] LoadingAPI.ready + GameplayAPI start/stop must be wired through the engine
  if (!/gameReady\(\)/.test(gameSrc)) problems.push('[lifecycle] игра не вызывает platform.gameReady()');
  if (!/gameplayStart\(\)/.test(gameSrc) || !/gameplayStop\(\)/.test(gameSrc)) problems.push('[lifecycle] нет gameplayStart()/gameplayStop()');

  // [direct-sdk] games must not call portal SDKs directly — only engine/platform does
  if (/YaGames|ysdk\./.test(gameSrc)) problems.push('[direct-sdk] прямое обращение к YaGames в коде игры, используйте @engine/platform');
  if (/\bbridge\.(platform|advertisement|storage|initialize)|@playgama\/bridge/.test(gameSrc)) problems.push('[direct-sdk] прямое обращение к Playgama Bridge в коде игры, используйте @engine/platform');
  if (/CrazyGames\.SDK|crazygames-sdk/.test(gameSrc)) problems.push('[direct-sdk] прямое обращение к CrazyGames SDK в коде игры, используйте @engine/platform');

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

  const name = `${t.kind}/${t.name} [${target}]`;
  if (problems.length) {
    failed++;
    console.error(`✖ ${name}\n${problems.map((p) => '   ' + p).join('\n')}`);
  } else console.log(`✔ ${name} (${(total / 1e6).toFixed(2)} МБ, ${files.length} файлов)`);
  warnings.forEach((w) => console.warn(`   ⚠ ${w}`));
}
process.exit(failed ? 1 : 0);
