import * as Phaser from 'phaser';
import { textButton } from '@engine/ui';
import { CTX, type GameContext } from '../context';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    const ctx = this.registry.get(CTX) as GameContext;
    const { width, height } = this.scale.gameSize;
    ctx.platform.gameplayStop();

    this.add.text(width / 2, height * 0.25, ctx.t.lang === 'ru' ? ctx.config.title.ru : ctx.config.title.en, {
      fontFamily: 'system-ui, sans-serif', fontSize: '64px', color: ctx.config.colors.text, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.35, ctx.t('menu.best', { n: ctx.save.get('best') }), {
      fontFamily: 'system-ui, sans-serif', fontSize: '36px', color: ctx.config.colors.accent,
    }).setOrigin(0.5);

    textButton(this, width / 2, height * 0.55, ctx.t('menu.play'), () => this.scene.start('game'))
      .setName('btn-play');

    const soundLabel = () => ctx.t(ctx.audio.isUserMuted ? 'menu.sound.off' : 'menu.sound.on');
    const soundBtn = textButton(this, width / 2, height * 0.68, soundLabel(), () => {
      ctx.audio.setUserMuted(!ctx.audio.isUserMuted);
      ctx.save.set('muted', ctx.audio.isUserMuted);
      soundBtn.setText(soundLabel());
    }, { fontSize: '30px', backgroundColor: '#495057' });
  }
}
