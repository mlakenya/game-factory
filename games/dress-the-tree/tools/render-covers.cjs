#!/usr/bin/env node
/**
 * Playgama console covers (square 800×800, portrait 1080×1920, landscape 1920×1080) built from a real game
 * screenshot (release/media/phone-en-2-level.png): the game's own tree with toys on their branches, the HUD and
 * ad buttons cut off, the edges widened by stretching the screenshot's border pixels, the English title on top.
 *   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node games/dress-the-tree/tools/render-covers.cjs [outDir]
 */
const { chromium } = require('playwright');
const { readFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const out = process.argv[2] ?? join(root, 'release/media/playgama');
const shot = `data:image/png;base64,${readFileSync(join(root, 'release/media/phone-en-2-level.png')).toString('base64')}`;

// Scene rows of the 1080×1920 phone shot: below the HUD, above the ad buttons. Rows 0..SKY_ROWS are plain sky.
const SCENE = { y: 250, h: 1495 };
const SKY_ROWS = 250;
const SNOW_ROW = 1330; // first row of the snow hills at the shot's left edge
const TITLE = 'Dress the Tree';
const TAGLINE = 'Match three. Keep the balance!';

/** Each cover: canvas size, scene height and left edge, title boxes (CSS). */
const covers = {
  portrait: { w: 1080, h: 1920, sceneH: 1495, sceneX: 0, texts: [
    { text: TITLE, size: 138, css: 'left:0;top:120px;width:1080px;text-align:center' },
    { text: TAGLINE, size: 54, css: 'left:0;top:300px;width:1080px;text-align:center;color:#ffe14d' }] },
  landscape: { w: 1920, h: 1080, sceneH: 1080, sceneX: 930, texts: [
    { text: 'Dress<br>the Tree', size: 156, css: 'left:110px;top:300px;width:800px;line-height:1' },
    { text: TAGLINE, size: 50, css: 'left:116px;top:690px;width:820px;white-space:nowrap;color:#ffe14d' }] },
  square: { w: 800, h: 800, sceneH: 670, sceneX: null, texts: [
    { text: TITLE, size: 82, css: 'left:0;top:28px;width:800px;text-align:center' }] },
};

const page = (c) => `<!doctype html><html><body style="margin:0;width:${c.w}px;height:${c.h}px;position:relative;overflow:hidden">
<canvas id="c" width="${c.w}" height="${c.h}" style="position:absolute;left:0;top:0"></canvas>
${c.texts.map((t) => `<div style="position:absolute;font:800 ${t.size}px Inter, system-ui, sans-serif;color:#fff;
  -webkit-text-stroke:${Math.round(t.size * 0.08)}px #1a1f6e;paint-order:stroke fill;letter-spacing:-0.01em;
  text-shadow:0 ${Math.round(t.size * 0.06)}px 0 rgba(10,12,60,.45);${t.css}">${t.text}</div>`).join('\n')}
<script>
const C = ${JSON.stringify(c)}, SCENE = ${JSON.stringify(SCENE)}, SKY_ROWS = ${SKY_ROWS}, SNOW_ROW = ${SNOW_ROW};
const img = new Image();
img.onload = () => {
  const g = document.getElementById('c').getContext('2d');
  const k = C.sceneH / SCENE.h, sw = Math.round(1080 * k);
  const sx = C.sceneX ?? Math.round((C.w - sw) / 2), sy = C.h - C.sceneH;
  // Sides: each scene row continued with the median colour of the shot's border strip (median drops snowflakes).
  // Above the snow hills the sky is a plain vertical gradient: both sides take the right strip (no moon there).
  const src = document.createElement('canvas'); src.width = 1080; src.height = 1920;
  const s = src.getContext('2d'); s.drawImage(img, 0, 0);
  const strip = (x0, y) => {
    const d = s.getImageData(x0, y, 30, 1).data, ch = [[], [], []];
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) ch[c].push(d[i + c]);
    return 'rgb(' + ch.map((v) => v.sort((a, b) => a - b)[15]).join(',') + ')';
  };
  // Sky above the scene: the shot's plain-sky rows (above the HUD's level) stretched to the free height.
  for (let y = 0; y < sy; y++) { g.fillStyle = strip(1050, Math.floor(y * SKY_ROWS / sy)); g.fillRect(0, y, C.w, 1); }
  const rowH = Math.ceil(k) + 1;
  for (let y = 0; y < SCENE.h; y++) {
    const yy = SCENE.y + y, dy = sy + Math.floor(y * k);
    const right = strip(1050, yy), left = yy < SNOW_ROW ? right : strip(0, yy);
    if (sx > 0) { g.fillStyle = left; g.fillRect(0, dy, sx + 1, rowH); }
    if (sx + sw < C.w) { g.fillStyle = right; g.fillRect(sx + sw - 1, dy, C.w - sx - sw + 1, rowH); }
  }
  g.drawImage(img, 0, SCENE.y, 1080, SCENE.h, sx, sy, sw, C.sceneH);
  document.title = 'ready';
};
img.src = ${JSON.stringify(shot)};
</script></body></html>`;

(async () => {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  for (const [name, c] of Object.entries(covers)) {
    const p = await browser.newPage({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 1 });
    await p.setContent(page(c));
    await p.waitForFunction(() => document.title === 'ready');
    await p.screenshot({ path: join(out, `cover-${name}.png`) });
    await p.close();
    console.log(`cover-${name}.png ${c.w}×${c.h}`);
  }
  await browser.close();
})();
