#!/usr/bin/env python3
"""
Renders the game's own waltz (content/music.ts) to audio/music.mp3 with sampled music-box notes,
for the Playgama build (Playgama does not accept sound synthesized in code, rule 3.3.2).

Samples: FluidR3 GM "music_box" (Frank Wen), CC BY 3.0, from https://github.com/gleitz/midi-js-soundfonts
Usage (needs numpy and ffmpeg):
  git clone --filter=blob:none --no-checkout https://github.com/gleitz/midi-js-soundfonts <work>/sf
  (cd <work>/sf && git checkout HEAD -- 'FluidR3_GM/music_box-mp3')
  node --experimental-strip-types -e "import('./games/dress-the-tree/content/music.ts').then(m=>console.log(JSON.stringify({BARS:m.BARS,TEMPO_BPM:m.TEMPO_BPM})))" > <work>/score.json
  python3 games/dress-the-tree/tools/render-music.py <work> games/dress-the-tree/audio/music.mp3
The arrangement mirrors src/music.ts: melody, bass on 1, chord on 2 and 3, a bell every 4 bars.
"""
S, OUT = sys.argv[1], sys.argv[2]
SR = 44100
score = json.load(open(f'{S}/score.json'))
def load(n):
    raw = subprocess.run(['ffmpeg','-v','error','-i',f'{S}/sf/FluidR3_GM/music_box-mp3/{n}.mp3','-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
cache = {}
beat = 60 / score['TEMPO_BPM']
bars = score['BARS']
loop_len = int(round(len(bars) * 3 * beat * SR))
mix = np.zeros(loop_len + SR * 4, dtype=np.float32)
def note(n, t, dur, vol):
    if n not in cache: cache[n] = load(n)
    s = cache[n]
    keep = min(len(s), int((dur + 0.6) * SR))      # let the tine ring a little past its note
    seg = s[:keep].copy()
    fade = min(int(0.25 * SR), keep)
    seg[-fade:] *= np.linspace(1, 0, fade)
    i = int(t * SR); mix[i:i+keep] += seg * vol
for bi, b in enumerate(bars):
    t0 = bi * 3 * beat; t = t0
    for n, beats in b['melody']:
        note(n, t, beats * beat, 1.0); t += beats * beat
    note(b['chord'][0], t0, beat * 1.2, 0.55)
    for k in (1, 2):
        for n in b['chord'][1:]: note(n, t0 + k * beat, beat * 0.8, 0.22)
    if bi % 4 == 3: note('C6', t0 + 2.5 * beat, 1.2, 0.35)
# Seamless loop: wrap the ringing tail past the end back onto the start.
loop = mix[:loop_len].copy(); tail = mix[loop_len:]; loop[:len(tail)] += tail[:loop_len]
loop /= np.max(np.abs(loop)) / 0.89
pcm = (loop * 32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar',str(SR),'-ac','1','-i','-','-af','loudnorm=I=-20:TP=-2','-ar',str(SR),'-c:a','libmp3lame','-b:a','96k',OUT],input=pcm,check=True)
print(f'{loop_len/SR:.1f}s')
