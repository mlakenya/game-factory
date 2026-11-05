import * as Phaser from 'phaser';
import { TOYS } from '../content/toys';

const vec = (pts: [number, number][]) => pts.map(([x, y]) => new Phaser.Math.Vector2(x, y));

export const toyKey = (k: number) => `toy-${k}`;
export const TOY_W = 64;
export const TOY_H = 84;

/** Draws all toy textures once (vector shapes, no image files). Hanging point is the top centre. */
export function makeTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(toyKey(0))) return;
  const OUTLINE = 0x1b1340;
  TOYS.forEach((toy, k) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const cx = TOY_W / 2;
    // String loop
    g.lineStyle(2, 0xffffff, 0.95);
    g.lineBetween(cx, 0, cx, 14);
    if (toy.shape === 'ball') {
      g.fillStyle(OUTLINE).fillRect(cx - 9, 10, 18, 12);
      g.fillStyle(0xf2c230).fillRect(cx - 7, 12, 14, 8);
      g.fillStyle(OUTLINE).fillCircle(cx, 48, 29);
      g.fillStyle(toy.color).fillCircle(cx, 48, 26);
      // Band pattern and glossy highlight
      g.fillStyle(toy.accent, 0.55).fillRect(cx - 26, 46, 52, 7);
      g.fillStyle(0xffffff, 0.85).fillCircle(cx - 10, 37, 7);
      g.fillStyle(0xffffff, 0.5).fillCircle(cx - 3, 31, 3);
    } else if (toy.shape === 'cone') {
      g.fillStyle(OUTLINE).fillEllipse(cx, 50, 46, 66);
      g.fillStyle(toy.color).fillEllipse(cx, 50, 40, 60);
      g.fillStyle(toy.accent, 0.95);
      for (let row = 0; row < 4; row++) {
        const y = 30 + row * 12;
        const half = row === 0 || row === 3 ? 1 : 2;
        for (let i = -half; i <= half; i++) g.fillTriangle(cx + i * 9 - 4, y, cx + i * 9 + 4, y, cx + i * 9, y + 7);
      }
      g.fillStyle(OUTLINE).fillRect(cx - 4, 12, 8, 10);
      g.fillStyle(0x7a4a1e).fillRect(cx - 2, 14, 4, 8);
    } else {
      const bell = (d: number) => vec([
        [cx, 18 - d], [cx + 10 + d, 22 - d], [cx + 16 + d, 40], [cx + 18 + d, 60 - d],
        [cx + 28 + d, 70 + d], [cx - 28 - d, 70 + d], [cx - 18 - d, 60 - d], [cx - 16 - d, 40], [cx - 10 - d, 22 - d],
      ]);
      g.fillStyle(OUTLINE).fillCircle(cx, 18, 7);
      g.fillStyle(0xf2c230).fillCircle(cx, 18, 5);
      g.fillStyle(OUTLINE).fillPoints(bell(3), true);
      g.fillStyle(toy.color).fillPoints(bell(0), true);
      g.fillStyle(toy.accent, 0.9).fillRect(cx - 24, 63, 48, 5);
      g.fillStyle(OUTLINE).fillCircle(cx, 77, 9);
      g.fillStyle(0xffe066).fillCircle(cx, 77, 6);
      g.fillStyle(0xffffff, 0.7).fillEllipse(cx - 7, 40, 6, 20);
    }
    g.generateTexture(toyKey(k), TOY_W, TOY_H + 4);
    g.destroy();
  });

  // Star for the top of the tree
  const s = scene.make.graphics({ x: 0, y: 0 }, false);
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 46 : 20;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r] as [number, number];
  });
  s.fillStyle(0xffd43b).fillPoints(vec(pts), true);
  s.lineStyle(4, 0xfab005).strokePoints(vec(pts), true);
  s.generateTexture('star', 100, 100);
  s.destroy();

  // Gift box for cleared toys
  const b = scene.make.graphics({ x: 0, y: 0 }, false);
  b.fillStyle(0xc92a2a).fillRect(4, 30, 112, 80);
  b.fillStyle(0xe03131).fillRect(0, 18, 120, 22);
  b.fillStyle(0xffd43b).fillRect(52, 18, 16, 92);
  b.fillStyle(0xffd43b).fillEllipse(44, 14, 34, 20).fillEllipse(76, 14, 34, 20);
  b.generateTexture('box', 120, 112);
  b.destroy();

  // Snowflake (background decoration)
  const f = scene.make.graphics({ x: 0, y: 0 }, false);
  f.fillStyle(0xffffff).fillCircle(4, 4, 4);
  f.generateTexture('flake', 8, 8);
  f.destroy();
}

/** Night sky with moon, twinkling stars, snowy hills with lit houses, and falling snow. */
export function drawBackground(scene: Phaser.Scene, top: number, bottom: number) {
  const { width, height } = scene.scale.gameSize;
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, width, height);
  // Moon with glow
  for (let r = 95; r > 45; r -= 12) g.fillStyle(0xfff6c8, 0.06).fillCircle(90, 270, r);
  g.fillStyle(0xfff3b0).fillCircle(90, 270, 42);
  g.fillStyle(0xf0dd8a, 0.8).fillCircle(78, 262, 8).fillCircle(102, 284, 5);
  // Far hills
  g.fillStyle(0x8f7ee8, 0.9).fillEllipse(width * 0.15, height - 250, 700, 260);
  g.fillStyle(0x7d6fe0, 0.9).fillEllipse(width * 0.95, height - 230, 760, 280);
  // Little houses with warm windows
  const house = (x: number, y: number, w: number, color: number) => {
    g.fillStyle(color).fillRect(x - w / 2, y - w * 0.6, w, w * 0.6);
    g.fillStyle(0xffffff).fillTriangle(x - w / 2 - 8, y - w * 0.6 + 2, x + w / 2 + 8, y - w * 0.6 + 2, x, y - w * 1.05);
    g.fillStyle(0xffd43b).fillRect(x - w * 0.25, y - w * 0.42, w * 0.18, w * 0.18).fillRect(x + w * 0.07, y - w * 0.42, w * 0.18, w * 0.18);
  };
  house(70, height - 300, 60, 0xd6336c);
  house(150, height - 285, 46, 0x1c7ed6);
  house(width - 70, height - 290, 56, 0xf08c00);
  house(width - 150, height - 275, 42, 0x2f9e44);
  // Near snow
  g.fillStyle(0xdbe7ff).fillEllipse(width * 0.25, height - 150, 900, 220);
  g.fillStyle(0xffffff).fillEllipse(width * 0.8, height - 120, 900, 240);
  g.fillStyle(0xffffff).fillRect(0, height - 110, width, 110);
  // Twinkling stars
  for (let i = 0; i < 26; i++) {
    const s = scene.add.image(Math.random() * width, 160 + Math.random() * (height * 0.45), 'flake').setScale(0.3 + Math.random() * 0.4);
    scene.tweens.add({ targets: s, alpha: 0.2, duration: 600 + Math.random() * 1400, yoyo: true, repeat: -1, delay: Math.random() * 1500 });
  }
  for (let i = 0; i < 40; i++) {
    const flake = scene.add.image(Math.random() * width, Math.random() * height, 'flake')
      .setAlpha(0.3 + Math.random() * 0.5).setScale(0.4 + Math.random() * 0.8);
    const speed = 0.06 + Math.random() * 0.08; // px per ms
    const fall = () => {
      scene.tweens.add({
        targets: flake, y: height + 10, x: flake.x + (Math.random() - 0.5) * 60,
        duration: (height + 10 - flake.y) / speed,
        onComplete: () => { flake.setPosition(Math.random() * width, -10); fall(); },
      });
    };
    fall();
  }
}
