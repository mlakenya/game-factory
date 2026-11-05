import * as Phaser from 'phaser';
import { makeTextures, toyKey } from '../art';
import { config } from '../../game.config';

/**
 * Catalog art renderer (icon 512×512, cover 800×470). Not shipped with the game:
 * open promo.html?shot=<name> in a dev build and take a screenshot of the canvas.
 */
const shot = new URLSearchParams(location.search).get('shot') ?? 'icon-a';
const SIZES: Record<string, [number, number]> = {
  icon: [512, 512], cover: [800, 470],
  // Playgama console covers: exact sizes required.
  'pg-square': [800, 800], 'pg-portrait': [1080, 1920], 'pg-landscape': [1920, 1080],
};
const [w, h] = SIZES[shot] ?? SIZES[shot.split('-')[0]] ?? SIZES.icon;
const C = config.colors;

/** A fir tree whose foliage is `height` tall with the apex at (x, y); returns each tier's base line. */
function tree(scene: Phaser.Scene, x: number, y: number, height: number, tiers: number, angle: number) {
  const c = scene.add.container(x, y).setAngle(angle);
  const g = scene.add.graphics();
  const tierH = height / (1 + 0.7 * (tiers - 1));
  const bases = Array.from({ length: tiers }, (_, i) => ({
    apex: i * tierH * 0.7 - (i === 0 ? 0 : tierH * 0.12),
    y: i * tierH * 0.7 + tierH,
    half: height * (tiers === 1 ? 0.4 : 0.24 + (0.2 * i) / (tiers - 1)),
  }));
  const last = bases[tiers - 1].y;
  g.fillStyle(C.trunk).fillRect(-height * 0.05, last - 4, height * 0.1, height * 0.13);
  for (const { apex, y: base, half } of bases) {
    g.fillStyle(C.needlesEdge).fillTriangle(0, apex - 6, -half - 8, base + 6, half + 8, base + 6);
    g.fillStyle(C.needles).fillTriangle(0, apex, -half, base, half, base);
    g.fillStyle(C.needlesLight).fillTriangle(0, apex, -half, base, -half * 0.15, base);
  }
  c.add(g);
  return { c, bases };
}

/** Tree-top star drawn as a shape (rotation applied to the points). */
function star(scene: Phaser.Scene, x: number, y: number, r: number, angleDeg: number) {
  const a0 = Phaser.Math.DegToRad(angleDeg) - Math.PI / 2;
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 === 0 ? r : r * 0.44;
    const a = a0 + (i * Math.PI) / 5;
    return new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  });
  scene.add.graphics().fillStyle(0xffd43b).fillPoints(pts, true).lineStyle(4, 0xfab005).strokePoints(pts, true);
}

function garland(scene: Phaser.Scene, c: Phaser.GameObjects.Container, y: number, half: number, n: number) {
  const palette = [0xffe14d, 0xff4d6d, 0x4dd2ff, 0x7dff6b, 0xff9f1c];
  for (let i = 0; i <= n; i++) {
    const x = -half + (2 * half * i) / n;
    c.add(scene.add.circle(x, y + Math.sin(i) * 3, 12, palette[i % 5], 0.3));
    c.add(scene.add.circle(x, y + Math.sin(i) * 3, 5, palette[i % 5]));
  }
}

function hang(scene: Phaser.Scene, c: Phaser.GameObjects.Container, k: number, x: number, y: number, s: number) {
  c.add(scene.add.image(x, y, toyKey(k)).setOrigin(0.5, 0).setScale(s).setAngle(-c.angle));
}

/** Simple sky for small formats: gradient, moon, snowy ground, a few flakes. */
function sky(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(C.backgroundTop, C.backgroundTop, C.backgroundBottom, C.backgroundBottom, 1).fillRect(0, 0, w, h);
  // Moon (left out where a centered title sits at the top).
  if (!(shot.startsWith('pg-') && h >= w)) {
    for (let r = 70; r > 34; r -= 9) g.fillStyle(0xfff6c8, 0.07).fillCircle(w * 0.14, h * 0.16, r);
    g.fillStyle(0xfff3b0).fillCircle(w * 0.14, h * 0.16, 30);
  }
  g.fillStyle(0xdbe7ff).fillEllipse(w * 0.3, h * 1.02, w * 1.2, h * 0.32);
  g.fillStyle(0xffffff).fillEllipse(w * 0.8, h * 1.05, w * 1.2, h * 0.34);
  const r = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1; // fixed "random" for a stable image
  for (let i = 0; i < 30; i++) g.fillStyle(0xffffff, 0.4 + r(i) * 0.5).fillCircle(r(i + 1) * w, r(i + 2) * h * 0.8, 1.5 + r(i + 3) * 2.5);
}

class Promo extends Phaser.Scene {
  create() {
    makeTextures(this);
    sky(this);
    if (shot === 'icon-a') {
      // Leaning tree, the star sliding off the top.
      const { c, bases } = tree(this, 250, 95, 330, 3, 9);
      bases.forEach((b, i) => garland(this, c, b.y - 10, b.half * 0.85, 5 + i));
      hang(this, c, 0, -40, bases[0].y - 75, 1.25); hang(this, c, 7, 40, bases[0].y - 75, 1.25);
      hang(this, c, 1, -95, bases[1].y - 75, 1.25); hang(this, c, 4, 0, bases[1].y - 75, 1.25); hang(this, c, 8, 95, bases[1].y - 75, 1.25);
      hang(this, c, 9, -120, bases[2].y - 75, 1.25); hang(this, c, 2, 120, bases[2].y - 75, 1.25);
      star(this, 330, 70, 53, 28);
    } else if (shot === 'icon-b') {
      // Close-up: three red bells in a row about to fly away, star on top.
      const { c, bases } = tree(this, 256, 105, 320, 2, -5);
      garland(this, c, bases[0].y - 10, bases[0].half * 0.85, 6);
      garland(this, c, bases[1].y - 10, bases[1].half * 0.85, 8);
      [-100, 0, 100].forEach((x) => hang(this, c, 8, x, bases[1].y - 105, 1.6));
      hang(this, c, 1, 0, bases[0].y - 80, 1.3);
      star(this, 250, 92, 58, -8);
    } else if (shot === 'icon-c') {
      // Balance: heavy bell far out on the left against light balls on the right.
      const { c, bases } = tree(this, 256, 95, 330, 3, -10);
      bases.forEach((b, i) => garland(this, c, b.y - 10, b.half * 0.85, 5 + i));
      hang(this, c, 9, -130, bases[2].y - 75, 1.6);
      hang(this, c, 2, 60, bases[2].y - 75, 1.15); hang(this, c, 0, 135, bases[2].y - 75, 1.15);
      hang(this, c, 7, -40, bases[1].y - 75, 1.25); hang(this, c, 1, 60, bases[1].y - 75, 1.15);
      hang(this, c, 3, 0, bases[0].y - 75, 1.15);
      star(this, 218, 75, 51, -20);
    } else if (shot.startsWith('pg-')) {
      // Playgama covers (English): the leaning tree with the star sliding off, title beside or above it.
      const landscape = w > h;
      const square = w === h;
      const size = landscape ? h * 0.68 : square ? h * 0.52 : Math.min(w * 0.85, h * 0.5);
      const tx = landscape ? w * 0.68 : w * 0.5;
      const ty = landscape ? h * 0.2 : square ? h * 0.4 : h - size * 1.22;
      const k = size / 320;
      const { c, bases } = tree(this, tx, ty, size, 3, 7);
      bases.forEach((b, i) => garland(this, c, b.y - 10 * k, b.half * 0.85, 5 + i));
      const hk = (t: number, x: number, row: number) => hang(this, c, t, x * k, bases[row].y - 75 * k, 1.05 * k);
      hk(0, -35, 0); hk(7, 35, 0); hk(1, -85, 1); hk(5, 0, 1); hk(8, 85, 1); hk(9, -115, 2); hk(2, 115, 2);
      star(this, tx + 27 * k, ty - 10 * k, 44 * k, 22);
      const fs = landscape ? h * 0.13 : square ? w * 0.11 : w * 0.13;
      const titleX = landscape ? w * 0.06 : w / 2;
      const titleY = landscape ? h * 0.26 : square ? h * 0.05 : h * 0.1;
      this.add.text(titleX, titleY, config.title.en, {
        fontFamily: 'system-ui, sans-serif', fontSize: `${Math.round(fs)}px`, fontStyle: 'bold', color: '#ffffff',
        stroke: '#1a1f6e', strokeThickness: fs * 0.15, wordWrap: { width: landscape ? w * 0.42 : w * 0.9 }, lineSpacing: -fs * 0.18,
        align: landscape ? 'left' : 'center',
      }).setOrigin(landscape ? 0 : 0.5, 0);
    } else {
      // Cover: leaning tree on the right, title on the left.
      const ru = shot !== 'cover-en';
      const { c, bases } = tree(this, 585, 70, 320, 3, 7);
      bases.forEach((b, i) => garland(this, c, b.y - 10, b.half * 0.85, 5 + i));
      hang(this, c, 0, -35, bases[0].y - 75, 1.05); hang(this, c, 7, 35, bases[0].y - 75, 1.05);
      hang(this, c, 1, -85, bases[1].y - 75, 1.05); hang(this, c, 5, 0, bases[1].y - 75, 1.05); hang(this, c, 8, 85, bases[1].y - 75, 1.05);
      hang(this, c, 9, -115, bases[2].y - 75, 1.05); hang(this, c, 2, 115, bases[2].y - 75, 1.05);
      star(this, 612, 60, 44, 22);
      this.add.text(40, 120, ru ? config.title.ru : config.title.en, {
        fontFamily: 'system-ui, sans-serif', fontSize: '66px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#1a1f6e', strokeThickness: 10, wordWrap: { width: 400 }, lineSpacing: -12,
      });
      this.add.text(44, 310, ru ? 'Собирай тройки\nи держи равновесие!' : 'Match three and\nkeep the balance!', {
        fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffe14d',
        stroke: '#1a1f6e', strokeThickness: 8, lineSpacing: 4,
      });
    }
    (window as unknown as { __promoReady: boolean }).__promoReady = true;
  }
}

new Phaser.Game({
  type: Phaser.WEBGL, parent: 'promo', width: w, height: h, backgroundColor: '#000000',
  scene: [Promo], preserveDrawingBuffer: true, banner: false,
} as Phaser.Types.Core.GameConfig);
