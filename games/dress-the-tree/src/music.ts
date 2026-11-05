import type * as Phaser from 'phaser';
import type { SampleBank } from '@engine/audio';
import type { SoundKey } from './audio-files';
import { BARS, TEMPO_BPM } from '../content/music';

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Note name like 'Bb4' or 'F#3' → frequency in Hz (A4 = 440). */
export function noteHz(name: string): number {
  const m = /^([A-G])(b|#)?(\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const semis = SEMI[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + (Number(m[3]) - 4) * 12 - 9;
  return 440 * 2 ** (semis / 12);
}

/**
 * Background music: the waltz from content/music.ts played by a synthesized music box (Yandex build),
 * or the same waltz rendered with music-box samples (tools/render-music.py) where synthesis is not accepted (Playgama).
 * Notes are scheduled a little ahead on the WebAudio clock and routed through Phaser's master
 * mute node, so the AudioGate silences it during ads, in a hidden tab and when sound is off.
 */
export class Music {
  private timer: ReturnType<typeof setInterval> | undefined;
  private nextBarTime = 0;
  private bar = 0;
  private enabled = true;
  private out: GainNode | undefined;

  private stopFile: (() => void) | undefined;

  constructor(private game: Phaser.Game, private files?: SampleBank<SoundKey>) {}

  private get audio() {
    return this.game.sound as unknown as { context?: AudioContext; destination?: AudioNode };
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    // Silence notes already scheduled ahead right away, not after they finish.
    const { context } = this.audio;
    if (this.out && context) this.out.gain.setValueAtTime(on ? 1 : 0, context.currentTime);
    if (on) this.start(); else this.stop();
  }
  get isEnabled() { return this.enabled; }

  /** Safe to call many times; starts only once the audio context exists. */
  start() {
    const { context } = this.audio;
    if (this.files) {
      if (this.enabled && !this.stopFile && context) this.stopFile = this.files.play('music', { volume: 0.6, loop: true });
      return;
    }
    if (!this.enabled || this.timer || !context) return;
    if (context.state === 'suspended') context.resume().catch(() => undefined);
    this.nextBarTime = context.currentTime + 0.2;
    this.bar = 0;
    this.timer = setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  stop() {
    this.stopFile?.();
    this.stopFile = undefined;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private schedule() {
    const { context, destination: master } = this.audio;
    if (!context || !master) return;
    if (!this.out) { this.out = context.createGain(); this.out.connect(master); }
    const destination = this.out;
    const beat = 60 / TEMPO_BPM;
    // Fell behind (tab was hidden): skip ahead instead of playing a burst of notes.
    if (this.nextBarTime < context.currentTime) this.nextBarTime = context.currentTime + 0.05;
    while (this.nextBarTime < context.currentTime + 1.5) {
      const { melody, chord } = BARS[this.bar];
      const t0 = this.nextBarTime;
      let t = t0;
      for (const [note, beats] of melody) {
        this.pluck(context, destination, noteHz(note), t, beats * beat + 0.4, 0.07);
        t += beats * beat;
      }
      // Waltz accompaniment: bass on 1, chord on 2 and 3.
      this.pluck(context, destination, noteHz(chord[0]), t0, beat * 1.2, 0.05, 'triangle');
      for (const b of [1, 2]) {
        for (const n of chord.slice(1)) this.pluck(context, destination, noteHz(n), t0 + b * beat, beat * 0.8, 0.018);
      }
      // A soft bell sparkle at the end of every 4 bars.
      if (this.bar % 4 === 3) this.pluck(context, destination, noteHz('C6'), t0 + 2.5 * beat, 1.2, 0.025);
      this.nextBarTime += 3 * beat;
      this.bar = (this.bar + 1) % BARS.length;
    }
  }

  private pluck(ctx: AudioContext, out: AudioNode, hz: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine') {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, at);
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(hz * 4, at); // metallic music-box shimmer
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.18, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    overtone.connect(og).connect(gain);
    gain.connect(out);
    osc.start(at); overtone.start(at);
    osc.stop(at + dur + 0.05); overtone.stop(at + dur + 0.05);
  }
}
