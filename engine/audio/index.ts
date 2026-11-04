import type * as Phaser from 'phaser';

/**
 * Global mute that combines the player's setting with platform pauses (ads, hidden tab).
 * Yandex rejects games that keep playing sound during ads or in a background tab.
 */
export class AudioGate {
  private userMuted = false;
  private systemMuted = 0;

  constructor(private game: Phaser.Game) {}

  setUserMuted(m: boolean) { this.userMuted = m; this.apply(); }
  get isUserMuted() { return this.userMuted; }

  /** Nested-safe: each pushSystemMute must be paired with popSystemMute. */
  pushSystemMute() { this.systemMuted++; this.apply(); }
  popSystemMute() { this.systemMuted = Math.max(0, this.systemMuted - 1); this.apply(); }

  private apply() { this.game.sound.mute = this.userMuted || this.systemMuted > 0; }
}
