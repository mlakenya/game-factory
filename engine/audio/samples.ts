import type * as Phaser from 'phaser';

/**
 * Audio files (mp3/ogg) played through Phaser's WebAudio graph, so the global mute (AudioGate:
 * ads, hidden tab, portal mute, player setting) silences them like any other game sound.
 * Playgama does not accept sound synthesized in code (requirement 3.3.2): games use files there.
 *
 * Files are fetched and decoded lazily on first need, so they never delay gameReady().
 */
type SoundManager = { context?: AudioContext; destination?: AudioNode; mute: boolean };

export class SampleBank<K extends string> {
  private buffers = new Map<K, AudioBuffer>();
  private loading = new Map<K, Promise<AudioBuffer | null>>();

  constructor(private game: Phaser.Game, private urls: Record<K, string>) {}

  private get sm() { return this.game.sound as unknown as SoundManager; }

  /** Starts fetching and decoding; safe to call many times. Resolves null if the file can't be played. */
  load(key: K): Promise<AudioBuffer | null> {
    const ready = this.buffers.get(key);
    if (ready) return Promise.resolve(ready);
    let p = this.loading.get(key);
    if (!p) {
      const ctx = this.sm.context;
      p = !ctx ? Promise.resolve(null) : fetch(this.urls[key])
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => { this.buffers.set(key, buf); return buf; })
        .catch(() => null);
      this.loading.set(key, p);
    }
    return p;
  }

  /** Preloads every file in the background. */
  preloadAll() { (Object.keys(this.urls) as K[]).forEach((k) => void this.load(k)); }

  /**
   * Plays a one-shot (or a loop). A file that is not decoded yet is skipped for one-shots
   * (a late click sounds worse than none) and started when ready for loops.
   * Returns a stop function.
   */
  play(key: K, opts: { volume?: number; loop?: boolean } = {}): () => void {
    const { context: ctx, destination } = this.sm;
    if (!ctx || !destination) return () => undefined;
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    let src: AudioBufferSourceNode | null = null;
    let stopped = false;
    const start = (buf: AudioBuffer) => {
      if (stopped) return;
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = !!opts.loop;
      const gain = ctx.createGain();
      gain.gain.value = opts.volume ?? 1;
      src.connect(gain).connect(destination);
      src.start();
    };
    const buf = this.buffers.get(key);
    if (buf) start(buf);
    else if (opts.loop) void this.load(key).then((b) => b && start(b));
    else void this.load(key);
    return () => { stopped = true; try { src?.stop(); } catch { /* already stopped */ } };
  }
}
