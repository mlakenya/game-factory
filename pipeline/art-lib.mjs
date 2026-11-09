// Checks for the art stage: art/<id>/STYLE.md (style bible) and art/<id>/assets/ (approved assets).
// Every asset file must be named in CREDITS.md next to it, with its source and licence.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ASSET_EXT = /\.(png|webp|jpe?g|svg|mp3|ogg|wav|ttf|otf|woff2?)$/i;

function walk(d) {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Asset files under dir (relative paths with forward slashes). */
export function assetFiles(dir) {
  if (!existsSync(dir)) return [];
  return walk(dir).filter((f) => ASSET_EXT.test(f)).map((f) => relative(dir, f).split(sep).join('/'));
}

/**
 * Asset files that CREDITS.md does not mention. A file counts as credited when its relative path
 * or its folder (e.g. `ui/`) appears in CREDITS.md.
 */
export function uncredited(dir, creditsPath) {
  const credits = existsSync(creditsPath) ? readFileSync(creditsPath, 'utf8') : '';
  return assetFiles(dir).filter((f) => {
    if (credits.includes(f)) return false;
    const parts = f.split('/');
    for (let i = parts.length - 1; i > 0; i--) if (credits.includes(parts.slice(0, i).join('/') + '/')) return false;
    return true;
  });
}

/** Problems that block the «ассеты одобрены» status for art/<slug>. */
export function artAssetProblems(root, slug) {
  const base = join(root, 'art', slug);
  const dir = join(base, 'assets');
  const files = assetFiles(dir);
  if (!files.length) return [`статус «ассеты одобрены» требует файлы в art/${slug}/assets/ (скилл assets)`];
  if (!existsSync(join(base, 'CREDITS.md'))) return [`нет art/${slug}/CREDITS.md с источником и лицензией каждого ассета`];
  const miss = uncredited(dir, join(base, 'CREDITS.md'));
  return miss.length ? [`в art/${slug}/CREDITS.md не указаны: ${miss.slice(0, 8).join(', ')}${miss.length > 8 ? ' …' : ''}`] : [];
}
