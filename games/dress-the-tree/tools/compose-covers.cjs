#!/usr/bin/env node
/**
 * Playgama console covers from generated key art (release/media/recraft/*.svg, made in Recraft from
 * /mnt/project-files/dress-the-tree/recraft/prompts.md): the art is scaled to the slot, the missing width or
 * height is continued with the art's own edge colours (row/column median, so snowflakes don't streak),
 * and the English title is set on the free sky.
 *   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node games/dress-the-tree/tools/compose-covers.cjs
 */
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const media = join(__dirname, '../release/media');
const art = (name) => `data:image/svg+xml;base64,${readFileSync(join(media, 'recraft', `${name}.svg`)).toString('base64')}`;
const TITLE = 'Dress the Tree';
const TAGLINE = 'Match three. Keep the balance!';

/** Art box inside the slot: x, y, width, height. Free space is filled from the art edge it touches. */
const COVERS = {
  landscape: { w: 1920, h: 1080, art: 'landscape', box: [840, 0, 1080, 1080], texts: [
    { text: 'Dress<br>the Tree', size: 168, css: 'left:110px;top:270px;width:760px;line-height:1' },
    { text: TAGLINE, size: 52, css: 'left:116px;top:660px;white-space:nowrap;color:#ffe14d' }] },
  // Title and tagline above the moon. The art's top rows have dark smudges: replaced by plain sky.
  portrait: { w: 1080, h: 1920, art: 'portrait', box: [0, 260, 1080, 1890], cleanTop: 130, texts: [
    { text: TITLE, size: 128, css: 'left:0;top:50px;width:1080px;text-align:center' },
    { text: TAGLINE, size: 54, css: 'left:0;top:205px;width:1080px;text-align:center;color:#ffe14d' }] },
  // Art moved down a bit, the title on the sky above the moon and star.
  square: { w: 800, h: 800, art: 'square', box: [60, 120, 680, 680], texts: [
    { text: TITLE, size: 82, css: 'left:0;top:14px;width:800px;text-align:center' }] },
};

const page = (c) => `<!doctype html><html><body style="margin:0;width:${c.w}px;height:${c.h}px;position:relative;overflow:hidden">
<canvas id="c" width="${c.w}" height="${c.h}" style="position:absolute;left:0;top:0"></canvas>
${c.texts.map((t) => `<div style="position:absolute;font:800 ${t.size}px Inter, system-ui, sans-serif;color:#fff;
  -webkit-text-stroke:${Math.round(t.size * 0.08)}px #1a1f6e;paint-order:stroke fill;letter-spacing:-0.01em;
  text-shadow:0 ${Math.round(t.size * 0.06)}px 0 rgba(10,12,60,.45);${t.css}">${t.text}</div>`).join('\n')}
<script>
const C = ${JSON.stringify({ w: c.w, h: c.h, box: c.box, cleanTop: c.cleanTop ?? 0 })};
const img = new Image();
img.onload = () => {
  const [bx, by, bw, bh] = C.box;
  const src = document.createElement('canvas'); src.width = bw; src.height = bh;
  const s = src.getContext('2d'); s.drawImage(img, 0, 0, bw, bh);
  const median = (d) => { const ch = [[], [], []];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]);
    return 'rgb(' + ch.map((v) => v.sort((a, b) => a - b)[v.length >> 1]).join(',') + ')'; };
  const g = document.getElementById('c').getContext('2d');
  for (let y = 0; y < bh; y++) {  // left / right: each row continued with its edge colour
    if (bx > 0) { g.fillStyle = median(s.getImageData(0, y, 60, 1).data); g.fillRect(0, by + y, bx + 1, 1); }
    if (bx + bw < C.w) { g.fillStyle = median(s.getImageData(bw - 60, y, 60, 1).data); g.fillRect(bx + bw - 1, by + y, C.w - bx - bw + 1, 1); }
  }
  // Top: plain sky gradient from the game's navy down to the art's first clean row; bottom: last row continued.
  const top = by + C.cleanTop;
  if (top > 0) {
    const sky = g.createLinearGradient(0, 0, 0, top);
    sky.addColorStop(0, '#1a1f6e'); sky.addColorStop(1, median(s.getImageData(0, C.cleanTop, bw, 1).data));
    g.fillStyle = sky; g.fillRect(0, 0, C.w, top + 1);
  }
  for (let x = 0; x < C.w; x++) {
    const sx = Math.min(bw - 1, Math.max(0, x - bx));
    if (by + bh < C.h) { g.fillStyle = median(s.getImageData(sx, bh - 12, 1, 12).data); g.fillRect(x, by + bh - 1, 1, C.h - by - bh + 1); }
  }
  // A few snowflakes on the continued sky so it matches the art.
  const r = (n) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
  for (let i = 0; i < 40; i++) {
    const x = r(i) * C.w, y = r(i + 7) * C.h * 0.75;
    if (x >= bx && x < bx + bw && y >= top && y < by + bh) continue;
    g.fillStyle = 'rgba(255,255,255,' + (0.35 + r(i + 3) * 0.5) + ')'; g.beginPath(); g.arc(x, y, 2 + r(i + 5) * 4, 0, 7); g.fill();
  }
  g.drawImage(src, 0, C.cleanTop, bw, bh - C.cleanTop, bx, top, bw, bh - C.cleanTop);
  document.title = 'ready';
};
img.src = ${JSON.stringify(art(c.art))};
</script></body></html>`;

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  for (const [name, c] of Object.entries(COVERS)) {
    const p = await browser.newPage({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 1 });
    await p.setContent(page(c));
    await p.waitForFunction(() => document.title === 'ready', null, { timeout: 60000 });
    await p.screenshot({ path: join(media, 'playgama', `cover-${name}.png`) });
    await p.close();
    console.log(`cover-${name}.png ${c.w}×${c.h}`);
  }
  await browser.close();
})();
