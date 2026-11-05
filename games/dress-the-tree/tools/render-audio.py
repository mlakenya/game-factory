#!/usr/bin/env python3
"""
Renders the game's sound for the Playgama build (Playgama does not accept sound synthesized in code,
rule 3.3.2): the waltz from content/music.ts and every effect from src/sfx.ts, played note by note
with sampled music-box tines. Same notes as the synthesized Yandex build, a real instrument instead of oscillators.

Samples: FluidR3 GM "music_box" (Frank Wen), CC BY 3.0, from https://github.com/gleitz/midi-js-soundfonts
Usage (needs numpy and ffmpeg):
  git clone --filter=blob:none --no-checkout https://github.com/gleitz/midi-js-soundfonts <work>/sf
  (cd <work>/sf && git checkout HEAD -- 'FluidR3_GM/music_box-mp3')
  node --experimental-strip-types -e "import('./games/dress-the-tree/content/music.ts').then(m=>console.log(JSON.stringify({BARS:m.BARS,TEMPO_BPM:m.TEMPO_BPM})))" > <work>/score.json
  python3 games/dress-the-tree/tools/render-audio.py <work> games/dress-the-tree/audio
"""
import json, subprocess, sys, numpy as np

WORK, OUT = sys.argv[1], sys.argv[2]
SR = 44100
cache: dict[str, np.ndarray] = {}

def sample(n: str) -> np.ndarray:
    if n not in cache:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{WORK}/sf/FluidR3_GM/music_box-mp3/{n}.mp3',
                              '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        cache[n] = np.frombuffer(raw, dtype=np.float32)
    return cache[n]

def place(mix: np.ndarray, n: str, t: float, ring: float, vol: float):
    """Adds note n at time t, letting it ring for `ring` seconds with a soft fade."""
    s = sample(n)
    keep = min(len(s), int(ring * SR))
    seg = s[:keep].copy()
    fade = min(int(0.25 * SR), keep)
    seg[-fade:] *= np.linspace(1, 0, fade)
    i = int(t * SR)
    mix[i:i + keep] += seg * vol

def encode(pcm: np.ndarray, path: str, lufs: float, bitrate: str):
    pcm = pcm / (np.max(np.abs(pcm)) / 0.89)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-af', f'loudnorm=I={lufs}:TP=-2', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', bitrate, path],
                   input=(pcm * 32767).astype('<i2').tobytes(), check=True)

def render_music():
    score = json.load(open(f'{WORK}/score.json'))
    beat = 60 / score['TEMPO_BPM']
    bars = score['BARS']
    loop_len = int(round(len(bars) * 3 * beat * SR))
    mix = np.zeros(loop_len + SR * 4, dtype=np.float32)
    for bi, b in enumerate(bars):
        t0 = bi * 3 * beat
        t = t0
        for n, beats in b['melody']:
            place(mix, n, t, beats * beat + 0.6, 1.0)
            t += beats * beat
        place(mix, b['chord'][0], t0, beat * 1.2 + 0.6, 0.55)          # bass on 1
        for k in (1, 2):                                                  # chord on 2 and 3
            for n in b['chord'][1:]:
                place(mix, n, t0 + k * beat, beat * 0.8 + 0.6, 0.22)
        if bi % 4 == 3:
            place(mix, 'C6', t0 + 2.5 * beat, 1.8, 0.35)                 # bell every 4 bars
    # Seamless loop: the ringing tail past the end goes back onto the start.
    loop = mix[:loop_len].copy()
    tail = mix[loop_len:]
    loop[:len(tail)] += tail[:loop_len]
    encode(loop, f'{OUT}/music.mp3', -20, '96k')

# Effects: same pitches and rhythm as src/sfx.ts, as (note, start s, ring s, volume).
# Loudness (LUFS) keeps frequent effects (pick, drop) quiet and rare ones (win) brighter.
SFX = {
    'pick':   ([('E6', 0, 0.35, 1)], -30),
    'drop':   ([('C6', 0, 0.45, 1)], -28),
    'deny':   ([('Bb3', 0, 0.3, 1), ('A3', 0.08, 0.35, 0.8)], -30),
    'triple': ([('C6', 0, 0.7, 1), ('E6', 0.07, 0.7, 1), ('G6', 0.14, 0.9, 1)], -24),
    'creak':  ([('D3', 0, 0.5, 1), ('Eb3', 0.05, 0.5, 0.6)], -32),
    'fall':   ([('G5', 0, 0.4, 1), ('E5', 0.12, 0.4, 1), ('C5', 0.24, 0.4, 1), ('A4', 0.36, 0.5, 1), ('F4', 0.48, 0.9, 1)], -24),
    'thaw':   ([('A6', 0, 0.4, 1), ('D7', 0.06, 0.5, 0.8)], -28),
    'win':    ([(n, i * 0.11, 0.9, 1) for i, n in enumerate(['G5', 'B5', 'D6', 'G6', 'E6', 'G6'])], -20),
}

def render_sfx():
    for name, (notes, lufs) in SFX.items():
        end = max(t + ring for _, t, ring, _ in notes)
        mix = np.zeros(int((end + 0.05) * SR), dtype=np.float32)
        for n, t, ring, vol in notes:
            place(mix, n, t, ring, vol)
        encode(mix, f'{OUT}/{name}.mp3', lufs, '80k')

if __name__ == '__main__':
    render_music()
    render_sfx()
    print('rendered music and', len(SFX), 'effects')
