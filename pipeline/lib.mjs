import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A "target" is a game (games/<name>) or a template (templates/<name>) that has an index.html. */
export function listTargets() {
  const out = [];
  for (const kind of ['games', 'templates']) {
    const dir = join(ROOT, kind);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory() && existsSync(join(path, 'index.html'))) out.push({ kind, name, path });
    }
  }
  return out;
}

/** Resolve a name: games/ wins over templates/. Accepts "games/x" or "templates/x" too. */
export function resolveTarget(name) {
  if (!name) fail('Укажите игру: npm run <script> -- <name>   (или --all)');
  const [kind, n] = name.includes('/') ? name.split('/') : [null, name];
  const t = listTargets().find((x) => x.name === n && (!kind || x.kind === kind));
  if (!t) fail(`Не найдено: ${name}. Есть: ${listTargets().map((x) => `${x.kind}/${x.name}`).join(', ')}`);
  return t;
}

/** Targets from CLI args: names or --all. */
export function targetsFromArgs(args) {
  if (args.includes('--all')) return listTargets();
  const names = args.filter((a) => !a.startsWith('--'));
  return names.length ? names.map(resolveTarget) : [resolveTarget(undefined)];
}

export const distDir = (t) => join(ROOT, 'dist', t.kind === 'games' ? t.name : `_template-${t.name}`);

export function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
