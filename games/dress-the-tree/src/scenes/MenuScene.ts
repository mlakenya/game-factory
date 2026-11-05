import * as Phaser from 'phaser';
import { LEVELS } from '../../content/levels';
import { drawBackground, makeTextures, toyKey } from '../art';
import { CTX, FONT, type GameContext } from '../context';
import { daysToNewYear, ruPlural } from '../logic/progress';
import { button, title } from '../ui';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    const ctx = this.registry.get(CTX) as GameContext;
    const { width } = this.scale.gameSize;
    const cx = width / 2;
    ctx.platform.gameplayStop();
    makeTextures(this);
    drawBackground(this, ctx.config.colors.backgroundTop, ctx.config.colors.backgroundBottom);

    // Decorative tree
    const g = this.add.graphics();
    g.fillStyle(ctx.config.colors.trunk).fillRect(cx - 22, 560, 44, 70);
    [[250, 200, 320], [330, 160, 430], [410, 120, 560]].forEach(([w, top, bottom]) => {
      g.fillStyle(ctx.config.colors.needlesDark).fillTriangle(cx, top - 6, cx - w / 2 - 8, bottom + 6, cx + w / 2 + 8, bottom + 6);
      g.fillStyle(ctx.config.colors.needles).fillTriangle(cx, top, cx - w / 2, bottom, cx + w / 2, bottom);
    });
    [[-70, 300, 0], [60, 270, 7], [-110, 420, 4], [100, 400, 1], [-20, 470, 8], [150, 520, 2], [-160, 530, 9]]
      .forEach(([dx, y, k]) => this.add.image(cx + dx, y, toyKey(k)).setOrigin(0.5, 0).setScale(0.8));
    const star = this.add.image(cx, 100, 'star').setScale(0.9);
    this.tweens.add({ targets: star, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });

    title(this, cx, 700, ctx.t.lang === 'ru' ? ctx.config.title.ru : ctx.config.title.en, 76);
    const days = daysToNewYear(new Date());
    const countdown = days === null ? ctx.t('menu.holiday') : ctx.t(`menu.days.${ctx.t.lang === 'ru' ? ruPlural(days) : days === 1 ? 0 : 2}`, { n: days });
    this.add.text(cx, 775, countdown, { fontFamily: FONT, fontSize: '32px', color: ctx.config.colors.accent }).setOrigin(0.5);

    const unlocked = ctx.save.get('unlocked');
    const next = Math.min(unlocked, LEVELS.length);
    button(this, cx, 890, 440, 110, unlocked > 1 ? ctx.t('menu.continue', { n: next }) : ctx.t('menu.play'),
      () => this.scene.start('game', { level: next }), { name: 'btn-play', fontSize: 44 });

    const stars = ctx.save.get('stars').reduce((s, n) => s + n, 0);
    button(this, cx - 220, 1030, 200, 84, ctx.t('menu.stars', { n: stars, total: LEVELS.length * 3 }),
      () => this.scene.start('levels'), { color: ctx.config.colors.buttonAlt, fontSize: 30, name: 'btn-levels' });

    const soundLabel = () => ctx.t(ctx.sfx.isEnabled ? 'menu.sound.on' : 'menu.sound.off');
    const sound = button(this, cx, 1030, 200, 84, soundLabel(), () => {
      ctx.sfx.setEnabled(!ctx.sfx.isEnabled);
      ctx.save.set('muted', !ctx.sfx.isEnabled);
      if (ctx.sfx.isEnabled) ctx.sfx.pick();
      sound.setLabel(soundLabel());
    }, { color: ctx.config.colors.buttonAlt, fontSize: 26, name: 'btn-sound' });

    const musicLabel = () => ctx.t(ctx.music.isEnabled ? 'menu.music.on' : 'menu.music.off');
    const music = button(this, cx + 220, 1030, 200, 84, musicLabel(), () => {
      ctx.music.setEnabled(!ctx.music.isEnabled);
      ctx.save.set('musicOff', !ctx.music.isEnabled);
      music.setLabel(musicLabel());
    }, { color: ctx.config.colors.buttonAlt, fontSize: 26, name: 'btn-music' });
  }
}
