import * as Phaser from 'phaser';
import { LEVELS } from '../../content/levels';
import { drawBackground } from '../art';
import { CTX, FONT, type GameContext } from '../context';
import { button } from '../ui';

const COLORS = [0xe03131, 0x1c7ed6, 0xf59f00, 0x2f9e44, 0xd6336c, 0x7048e8];

/** Level map: 30 baubles, 5 per row. */
export class LevelsScene extends Phaser.Scene {
  constructor() { super('levels'); }

  create() {
    const ctx = this.registry.get(CTX) as GameContext;
    const { width } = this.scale.gameSize;
    ctx.platform.gameplayStop();
    drawBackground(this, ctx.config.colors.backgroundTop, ctx.config.colors.backgroundBottom);
    const unlocked = ctx.save.get('unlocked');
    const stars = ctx.save.get('stars');

    LEVELS.forEach((_, i) => {
      const level = i + 1;
      const col = i % 5, row = Math.floor(i / 5);
      const x = width / 2 + (col - 2) * 128;
      const y = 200 + row * 150;
      const open = level <= unlocked;
      const g = this.add.graphics({ x, y });
      g.lineStyle(2, 0xf1f3f5, 0.6).lineBetween(0, -70, 0, -46);
      g.fillStyle(0xd4a017).fillRect(-8, -50, 16, 10);
      g.fillStyle(open ? COLORS[row % COLORS.length] : 0x3b4a66).fillCircle(0, 0, 46);
      g.fillStyle(0xffffff, 0.25).fillCircle(-14, -14, 12);
      this.add.text(x, y, String(level), { fontFamily: FONT, fontSize: '36px', color: open ? '#ffffff' : '#7d8aa5', fontStyle: 'bold' })
        .setOrigin(0.5);
      const got = stars[i] ?? 0;
      if (got > 0) this.add.text(x, y + 62, '★'.repeat(got) + '☆'.repeat(3 - got), { fontFamily: FONT, fontSize: '24px', color: '#ffd43b' }).setOrigin(0.5);
      if (open) {
        const hit = this.add.zone(x, y, 110, 120).setInteractive({ useHandCursor: true }).setName(`level-${level}`);
        hit.on('pointerup', () => this.scene.start('game', { level }));
      }
    });

    button(this, width / 2, 1160, 360, 92, ctx.t('common.menu'), () => this.scene.start('menu'),
      { color: ctx.config.colors.buttonAlt, name: 'btn-menu' });
  }
}
