import * as Phaser from 'phaser';
import { FONT } from './context';

export interface ButtonOpts {
  color?: string;
  fontSize?: number;
  /** Small second line, e.g. «реклама» on rewarded buttons. */
  sub?: string;
  name?: string;
}

/** Rounded button with press feedback. Hit area covers the whole shape (mobile friendly). */
export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, opts: ButtonOpts = {},
) {
  const color = Phaser.Display.Color.HexStringToColor(opts.color ?? '#c92a2a').color;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 22);
  g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
  g.fillStyle(0xffffff, 0.12).fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.42, 18);
  const text = scene.add.text(0, opts.sub ? -10 : 0, label, {
    fontFamily: FONT, fontSize: `${opts.fontSize ?? 38}px`, color: '#ffffff', fontStyle: 'bold', align: 'center',
  }).setOrigin(0.5);
  c.add([g, text]);
  if (opts.sub) {
    c.add(scene.add.text(0, 24, `▶ ${opts.sub}`, { fontFamily: FONT, fontSize: '20px', color: '#e9fbe9' }).setOrigin(0.5));
  }
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  if (opts.name) c.setName(opts.name);
  c.on('pointerdown', () => c.setScale(0.95));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); onClick(); });
  return Object.assign(c, {
    setLabel: (s: string) => text.setText(s),
    setEnabled: (on: boolean) => { c.setAlpha(on ? 1 : 0.45); if (on) c.setInteractive(); else c.disableInteractive(); },
  });
}
export type Button = ReturnType<typeof button>;

/** Dark full-screen veil that swallows input (for overlays). */
export function veil(scene: Phaser.Scene, alpha = 0.6) {
  const { width, height } = scene.scale.gameSize;
  return scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, alpha).setInteractive();
}

/** Panel background for overlays. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x0b1d3a, 0.96).fillRoundedRect(x - w / 2, y - h / 2, w, h, 32);
  g.lineStyle(4, 0xffd43b, 0.9).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 32);
  return g;
}

export function title(scene: Phaser.Scene, x: number, y: number, s: string, size = 56, color = '#ffffff') {
  return scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold', align: 'center',
    stroke: '#0b1d3a', strokeThickness: 6, wordWrap: { width: 640 },
  }).setOrigin(0.5);
}
