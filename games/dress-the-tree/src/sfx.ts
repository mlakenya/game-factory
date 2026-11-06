import type * as Phaser from 'phaser';
import type { SampleBank } from '@engine/audio';
import type { SoundKey } from './audio-files';

type Note = { f: number; t: number; d: number; type?: OscillatorType; v?: number; slide?: number };

/**
 * Sound effects: synthesized in the Yandex build; where synthesis is not accepted (Playgama) the same notes
 * rendered with music-box samples (tools/render-audio.py) play from a SampleBank. Both are routed through
 * Phaser's master mute node,
 * so AudioGate mutes them during ads and in background tabs. The «Sound» button only turns effects off;
 * music has its own switch (src/music.ts).
 */
export class Sfx {
  private enabled = true;
  constructor(private game: Phaser.Game, private files?: SampleBank<SoundKey>) {
    files?.preloadAll();
  }

  setEnabled(on: boolean) { this.enabled = on; }
  get isEnabled() { return this.enabled; }

  /** Plays the file version when this build has files; true if handled. */
  private file(key: SoundKey, volume = 0.7): boolean {
    if (!this.files) return false;
    if (this.enabled && !(this.game.sound as unknown as { mute: boolean }).mute) this.files.play(key, { volume });
    return true;
  }

  private play(notes: Note[]) {
    const sm = this.game.sound as unknown as { context?: AudioContext; destination?: AudioNode; mute: boolean };
    const ctx = sm.context;
    if (!this.enabled || !ctx || !sm.destination || sm.mute) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, now + n.t + n.d);
      const v = n.v ?? 0.18;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(v, now + n.t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
      osc.connect(gain).connect(sm.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    }
  }

  pick() { if (this.file('pick')) return; this.play([{ f: 880, t: 0, d: 0.08, type: 'triangle', v: 0.12 }]); }
  drop() { if (this.file('drop')) return; this.play([{ f: 520, t: 0, d: 0.1, type: 'triangle', v: 0.14 }]); }
  deny() { if (this.file('deny', 0.5)) return; this.play([{ f: 200, t: 0, d: 0.12, type: 'square', v: 0.05 }]); }
  triple() {
    if (this.file('triple')) return;
    this.play([1047, 1319, 1568].map((f, i) => ({ f, t: i * 0.07, d: 0.35, type: 'sine' as const, v: 0.15 })));
  }
  creak() { if (this.file('creak', 0.5)) return; this.play([{ f: 110, t: 0, d: 0.25, type: 'sawtooth', v: 0.04, slide: 80 }]); }
  fall() { if (this.file('fall')) return; this.play([{ f: 900, t: 0, d: 0.7, type: 'triangle', v: 0.15, slide: 120 }]); }
  thaw() { if (this.file('thaw', 0.6)) return; this.play([{ f: 1800, t: 0, d: 0.2, v: 0.08 }, { f: 2400, t: 0.06, d: 0.2, v: 0.06 }]); }
  win() {
    if (this.file('win', 0.8)) return;
    this.play([784, 988, 1175, 1568, 1319, 1568].map((f, i) => ({ f, t: i * 0.11, d: 0.4, type: 'triangle' as const, v: 0.14 })));
  }
}
