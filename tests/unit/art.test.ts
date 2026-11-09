import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { artAssetProblems, uncredited } from '../../pipeline/art-lib.mjs';

function project(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'art-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), body);
  }
  return root;
}

describe('art assets', () => {
  it('needs assets and a credits file', () => {
    expect(artAssetProblems(project({}), 'g').join()).toMatch(/требует файлы/);
    expect(artAssetProblems(project({ 'art/g/assets/a.png': 'x' }), 'g').join()).toMatch(/CREDITS/);
  });

  it('accepts files credited by path or by folder', () => {
    const root = project({
      'art/g/assets/toys/ball.png': 'x',
      'art/g/assets/ui/btn.png': 'x',
      'art/g/assets/bg.png': 'x',
      'art/g/CREDITS.md': '- `toys/ball.png` FLUX.2 klein 4B\n- `ui/` Kenney UI Pack, CC0\n',
    });
    expect(uncredited(join(root, 'art/g/assets'), join(root, 'art/g/CREDITS.md'))).toEqual(['bg.png']);
    expect(artAssetProblems(root, 'g').join()).toMatch(/bg\.png/);
  });
});
