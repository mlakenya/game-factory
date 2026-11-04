import * as Phaser from 'phaser';
import { CTX, type GameContext } from '../context';
import { button, panel, title, veil } from '../ui';

export interface OverlayAction { label: string; onClick: () => void; color?: string; sub?: string; name?: string }
export interface OverlayData {
  heading: string;
  text?: string;
  stars?: number;
  actions: OverlayAction[];
}

/** Modal on top of the game scene: pause, win, lose. Buttons close it before running the action. */
export class OverlayScene extends Phaser.Scene {
  constructor() { super('overlay'); }

  create(data: OverlayData) {
    const ctx = this.registry.get(CTX) as GameContext;
    const { width, height } = this.scale.gameSize;
    const cx = width / 2;
    veil(this, 0.55);
    const h = 200 + data.actions.length * 120 + (data.stars ? 140 : 0) + (data.text ? 70 : 0);
    const top = height / 2 - h / 2;
    panel(this, cx, height / 2, 600, h);
    let y = top + 90;
    title(this, cx, y, data.heading, 54, ctx.config.colors.accent);
    y += 80;
    if (data.text) {
      this.add.text(cx, y, data.text, {
        fontFamily: 'system-ui, sans-serif', fontSize: '30px', color: ctx.config.colors.text, align: 'center', wordWrap: { width: 520 },
      }).setOrigin(0.5);
      y += 70;
    }
    if (data.stars) {
      for (let i = 0; i < 3; i++) {
        const s = this.add.image(cx + (i - 1) * 120, y + 50, 'star').setScale(0);
        const on = i < data.stars;
        if (!on) s.setTint(0x3b4a66);
        this.tweens.add({ targets: s, scale: on ? 1.05 : 0.8, duration: 350, delay: 200 + i * 220, ease: 'Back.out' });
      }
      y += 140;
    }
    y += 40;
    for (const a of data.actions) {
      button(this, cx, y + 40, 460, 96, a.label, () => {
        this.scene.stop();
        a.onClick();
      }, { color: a.color, sub: a.sub, name: a.name, fontSize: a.sub ? 34 : 38 });
      y += 120;
    }
  }
}
