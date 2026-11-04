import * as Phaser from 'phaser';
import { CTX, type GameContext } from '../context';

/** Template core loop: tap targets before they disappear. Replace with the real mechanic. */
export class GameScene extends Phaser.Scene {
  private ctx!: GameContext;
  private score = 0;
  private timeLeft = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  constructor() { super('game'); }

  create() {
    this.ctx = this.registry.get(CTX) as GameContext;
    const { gameplay, colors } = this.ctx.config;
    const { width } = this.scale.gameSize;
    this.score = 0;
    this.timeLeft = gameplay.roundSeconds;

    const style = { fontFamily: 'system-ui, sans-serif', fontSize: '40px', color: colors.text };
    this.scoreText = this.add.text(24, 24, '', style);
    this.timeText = this.add.text(width - 24, 24, '', style).setOrigin(1, 0);
    this.updateHud();

    this.time.addEvent({ delay: gameplay.spawnEveryMs, loop: true, callback: () => this.spawnTarget() });
    this.time.addEvent({
      delay: 1000, repeat: gameplay.roundSeconds - 1, callback: () => {
        this.timeLeft--;
        this.updateHud();
        if (this.timeLeft <= 0) this.finish();
      },
    });

    this.ctx.platform.gameplayStart();
  }

  private spawnTarget() {
    const { width, height } = this.scale.gameSize;
    const r = Phaser.Math.Between(40, 70);
    const x = Phaser.Math.Between(r, width - r);
    const y = Phaser.Math.Between(140 + r, height - r);
    const color = Phaser.Display.Color.HexStringToColor(this.ctx.config.colors.accent).color;
    const target = this.add.circle(x, y, r, color).setInteractive({ useHandCursor: true });
    target.on('pointerdown', () => {
      this.score += Math.round(100 / r * 10);
      this.updateHud();
      target.destroy();
    });
    this.time.delayedCall(this.ctx.config.gameplay.targetLifetimeMs, () => target.active && target.destroy());
  }

  private updateHud() {
    this.scoreText.setText(this.ctx.t('game.score', { n: this.score }));
    this.timeText.setText(this.ctx.t('game.time', { n: this.timeLeft }));
  }

  private finish() {
    this.ctx.platform.gameplayStop();
    this.scene.start('over', { score: this.score });
  }
}
