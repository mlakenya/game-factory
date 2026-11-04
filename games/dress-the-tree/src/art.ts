import * as Phaser from 'phaser';
import { TOYS } from '../content/toys';

const vec = (pts: [number, number][]) => pts.map(([x, y]) => new Phaser.Math.Vector2(x, y));

export const toyKey = (k: number) => `toy-${k}`;
export const TOY_W = 64;
export const TOY_H = 84;

/** Draws all toy textures once (vector shapes, no image files). Hanging point is the top centre. */
export function makeTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(toyKey(0))) return;
  TOYS.forEach((toy, k) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const cx = TOY_W / 2;
    // String loop
    g.lineStyle(2, 0xf1f3f5, 0.9);
    g.lineBetween(cx, 0, cx, 14);
    if (toy.shape === 'ball') {
      g.fillStyle(0xd4a017).fillRect(cx - 7, 12, 14, 8);
      g.fillStyle(toy.color).fillCircle(cx, 48, 26);
      g.fillStyle(toy.accent, 0.9).fillCircle(cx - 9, 39, 7);
      g.lineStyle(3, toy.accent, 0.6).beginPath().arc(cx, 48, 18, 0.2, 1.3).strokePath();
    } else if (toy.shape === 'cone') {
      g.fillStyle(toy.color).fillEllipse(cx, 50, 40, 60);
      g.fillStyle(toy.accent, 0.85);
      for (let row = 0; row < 4; row++) {
        const y = 30 + row * 12;
        const half = row === 0 || row === 3 ? 1 : 2;
        for (let i = -half; i <= half; i++) g.fillTriangle(cx + i * 9 - 4, y, cx + i * 9 + 4, y, cx + i * 9, y + 7);
      }
      g.fillStyle(0x5c3d1e).fillRect(cx - 3, 14, 6, 8);
    } else {
      g.fillStyle(0xd4a017).fillCircle(cx, 18, 5);
      g.fillStyle(toy.color);
      g.fillPoints(vec([
        [cx, 18], [cx + 10, 22], [cx + 16, 40], [cx + 18, 60], [cx + 28, 70], [cx - 28, 70], [cx - 18, 60], [cx - 16, 40], [cx - 10, 22],
      ]), true);
      g.fillStyle(toy.accent, 0.8).fillRect(cx - 24, 64, 48, 5);
      g.fillStyle(0xffe066).fillCircle(cx, 76, 7);
      g.fillStyle(toy.accent, 0.7).fillEllipse(cx - 7, 38, 6, 18);
    }
    g.generateTexture(toyKey(k), TOY_W, TOY_H);
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

/** Vertical gradient background with falling snow. */
export function drawBackground(scene: Phaser.Scene, top: number, bottom: number) {
  const { width, height } = scene.scale.gameSize;
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(0xffffff, 0.9).fillRect(0, height - 90, width, 90);
  g.fillStyle(0xdde8f5, 1).fillEllipse(width * 0.2, height - 90, 380, 50).fillEllipse(width * 0.8, height - 92, 420, 56);
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
