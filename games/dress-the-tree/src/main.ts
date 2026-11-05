import * as Phaser from 'phaser';
import { Ads } from '@engine/ads';
import { AudioGate } from '@engine/audio';
import { createI18n } from '@engine/i18n';
import { initPlatform } from '@engine/platform';
import { SaveStore } from '@engine/save';
import { lockPageGestures } from '@engine/ui';
import { locales } from '../content/locales';
import { config } from '../game.config';
import { CTX, DEFAULT_SAVE, type GameContext, type SaveData } from './context';
import { GameScene } from './scenes/GameScene';
import { LevelsScene } from './scenes/LevelsScene';
import { MenuScene } from './scenes/MenuScene';
import { OverlayScene } from './scenes/OverlayScene';
import { Music } from './music';
import { Sfx } from './sfx';

async function boot() {
  lockPageGestures();
  const platform = await initPlatform({ storageKey: `gf-${config.id}` });
  const t = createI18n(locales, platform.lang);
  document.documentElement.lang = t.lang;
  document.title = t.lang === 'ru' ? config.title.ru : config.title.en;
  const save = await SaveStore.load<SaveData>(platform, { ...DEFAULT_SAVE });

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
    scene: [MenuScene, LevelsScene, GameScene, OverlayScene],
  });

  const audio = new AudioGate(game);

  const pauseAll = () => { audio.pushSystemMute(); game.loop.sleep(); };
  const resumeAll = () => { audio.popSystemMute(); game.loop.wake(); };
  const ads = new Ads(platform, { pause: pauseAll, resume: resumeAll }, config.ads.interstitialMinIntervalMs);

  let pausedBySystem = false;
  platform.onPauseChange((paused) => {
    if (paused && !pausedBySystem) { pausedBySystem = true; pauseAll(); }
    else if (!paused && pausedBySystem) { pausedBySystem = false; resumeAll(); }
  });

  // Portal mute (Playgama Bridge audio state): silent while the portal asks, also right at startup.
  let mutedByPortal = false;
  platform.onAudioChange((enabled) => {
    if (!enabled && !mutedByPortal) { mutedByPortal = true; audio.pushSystemMute(); }
    else if (enabled && mutedByPortal) { mutedByPortal = false; audio.popSystemMute(); }
  });

  const ctx: GameContext = { config, platform, t, save, ads, audio, sfx: new Sfx(game), music: new Music(game) };
  ctx.sfx.setEnabled(!save.get('muted'));
  ctx.music.setEnabled(!save.get('musicOff'));
  // Browsers allow audio only after the first tap; start the music then.
  const kick = () => ctx.music.start();
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
  game.registry.set(CTX, ctx);

  game.events.once(Phaser.Core.Events.READY, () => {
    platform.gameReady();
    (window as unknown as { __gameReady: boolean }).__gameReady = true;
  });
}

boot();
