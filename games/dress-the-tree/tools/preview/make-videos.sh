#!/usr/bin/env bash
# CrazyGames preview videos from the frames of record.spec.ts (see preview.config.ts for the whole run).
# Requirements (docs.crazygames.com/requirements/game-covers): 15–20 s, ≤ 50 MB, no sound, 1080p landscape 16:9
# and portrait 2:3, the static cover as the first frame, no black bars, no cursor, no promo text.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
frames=test-results/preview/portrait
media=games/dress-the-tree/release/media/crazygames
n=$(ls "$frames"/f*.png | wc -l)
hold=1.5   # seconds of the still cover before the game fades in
fade=0.5
total=$(python3 -c "print(round($hold + $n / 30, 2))")
enc=(-an -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -movflags +faststart)

# Portrait 1080×1620: cover, then a crossfade into the recording.
ffmpeg -y -loglevel error \
  -loop 1 -framerate 30 -t "$(python3 -c "print($hold + $fade)")" -i "$media/cover-portrait.png" \
  -framerate 30 -i "$frames/f%05d.png" \
  -filter_complex "[0:v]scale=1080:1620,setsar=1,format=yuv420p[c];[1:v]format=yuv420p,setsar=1[g];[c][g]xfade=transition=fade:duration=$fade:offset=$hold" \
  "${enc[@]}" "$media/preview-portrait.mp4"

# Landscape 1920×1080: the landscape cover stays as the backdrop (title on the left), the game's canvas
# (912×1620 at x=84 in the recording) fades in on the right, over the cover's tree.
ffmpeg -y -loglevel error \
  -loop 1 -framerate 30 -t "$total" -i "$media/cover-landscape.png" \
  -framerate 30 -i "$frames/f%05d.png" \
  -filter_complex "[1:v]crop=912:1620:84:0,scale=608:1080,format=yuva420p,fade=in:st=0:d=$fade:alpha=1,setpts=PTS+$hold/TB[g];[0:v][g]overlay=1262:0:eof_action=repeat,format=yuv420p" \
  -t "$total" "${enc[@]}" "$media/preview-landscape.mp4"

for f in "$media"/preview-*.mp4; do
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height:format=duration,size -of csv=p=0 "$f" | tr '\n' ' '
  echo " $f"
done
