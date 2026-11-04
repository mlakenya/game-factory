import * as Phaser from 'phaser';
import { textButton } from '@engine/ui';
import { CTX, type GameContext } from '../context';

export class OverScene extends Phaser.Scene {
  constructor() { super('over'); }

  create(data: { score: number }) {
    const ctx = this.registry.get(CTX) as GameContext;
    const { width, height } = this.scale.gameSize;
    let score = data.score ?? 0;

    const commitBest = () => {
      if (score > ctx.save.get('best')) ctx.save.set('best', score);
    };
    commitBest();

    const style = { fontFamily: 'system-ui, sans-serif', color: ctx.config.colors.text };
    this.add.text(width / 2, height * 0.25, ctx.t('over.title'), { ...style, fontSize: '64px', fontStyle: 'bold' }).setOrigin(0.5);
    const scoreText = this.add.text(width / 2, height * 0.35, ctx.t('over.score', { n: score }), { ...style, fontSize: '44px' }).setOrigin(0.5);

    const doubleBtn = textButton(this, width / 2, height * 0.5, ctx.t('over.double'), async () => {
      doubleBtn.disableInteractive().setAlpha(0.5);
      if (await ctx.ads.rewarded()) {
        score *= 2;
        scoreText.setText(ctx.t('over.score', { n: score }));
        commitBest();
      }
    }, { fontSize: '30px', backgroundColor: '#2f9e44' });

    // Natural pause: an interstitial before the next round is allowed here.
    textButton(this, width / 2, height * 0.63, ctx.t('over.again'), async () => {
      await ctx.ads.interstitial();
      this.scene.start('game');
    }).setName('btn-again');

    textButton(this, width / 2, height * 0.75, ctx.t('over.menu'), () => this.scene.start('menu'),
      { fontSize: '30px', backgroundColor: '#495057' });
  }
}
