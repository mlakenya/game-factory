import * as Phaser from 'phaser';
import { Ads } from '@engine/ads';
import { AudioGate } from '@engine/audio';
import { createI18n } from '@engine/i18n';
import { initPlatform } from '@engine/platform';
import { SaveStore } from '@engine/save';
import { lockPageGestures } from '@engine/ui';
import { locales } from '../content/locales';
import { config } from '../game.config';
import { CTX, type GameContext, type SaveData } from './context';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { OverScene } from './scenes/OverScene';

async function boot() {
  lockPageGestures();
  const platform = await initPlatform({ storageKey: `gf-${config.id}` });
  const t = createI18n(locales, platform.lang);
  document.documentElement.lang = t.lang;
  document.title = t.lang === 'ru' ? config.title.ru : config.title.en;
  const save = await SaveStore.load<SaveData>(platform, { best: 0, muted: false });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: config.colors.background,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: config.width,
      height: config.height,
    },
    scene: [MenuScene, GameScene, OverScene],
  });

  const audio = new AudioGate(game);
  audio.setUserMuted(save.get('muted'));

  const pauseAll = () => { audio.pushSystemMute(); game.loop.sleep(); };
  const resumeAll = () => { audio.popSystemMute(); game.loop.wake(); };
  const ads = new Ads(platform, { pause: pauseAll, resume: resumeAll }, config.ads.interstitialMinIntervalMs);

  let pausedBySystem = false;
  platform.onPauseChange((paused) => {
    if (paused && !pausedBySystem) { pausedBySystem = true; pauseAll(); }
    else if (!paused && pausedBySystem) { pausedBySystem = false; resumeAll(); }
  });

  const ctx: GameContext = { config, platform, t, save, ads, audio };
  game.registry.set(CTX, ctx);

  game.events.once(Phaser.Core.Events.READY, () => {
    platform.gameReady();
    (window as unknown as { __gameReady: boolean }).__gameReady = true;
  });
}

boot();
